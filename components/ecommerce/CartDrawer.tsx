/**
 * CartDrawer
 * Panel lateral del carrito de compras para el storefront
 */

import React from 'react';
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
    primaryColor?: string;
    freeShippingThreshold?: number;
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
    primaryColor = '#6366f1',
    freeShippingThreshold = 0,
}) => {
    const [discountInput, setDiscountInput] = React.useState('');
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
                setDiscountError(result.error || 'Código inválido');
            } else {
                setDiscountInput('');
            }
        } catch (error) {
            setDiscountError('Error al aplicar el código');
        } finally {
            setIsApplyingDiscount(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transform transition-transform">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <ShoppingCart size={24} style={{ color: primaryColor }} />
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Tu Carrito
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Free Shipping Progress */}
                {freeShippingThreshold > 0 && remainingForFreeShipping > 0 && items.length > 0 && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            ¡Te faltan <span className="font-bold" style={{ color: primaryColor }}>{currencySymbol}{remainingForFreeShipping.toFixed(2)}</span> para envío gratis!
                        </p>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%`,
                                    backgroundColor: primaryColor,
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <ShoppingBag className="text-gray-300 dark:text-gray-600 mb-4" size={64} />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Tu carrito está vacío
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Agrega productos para comenzar
                            </p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 rounded-lg text-white font-medium transition-colors"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Seguir comprando
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div
                                    key={`${item.productId}-${item.variantId || 'default'}`}
                                    className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                                >
                                    {/* Image */}
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt={item.productName}
                                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <ShoppingBag className="text-gray-400" size={24} />
                                        </div>
                                    )}

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                            {item.productName}
                                        </h4>
                                        {item.variantName && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {item.variantName}
                                            </p>
                                        )}
                                        <p className="font-bold mt-1" style={{ color: primaryColor }}>
                                            {currencySymbol}{item.price.toFixed(2)}
                                        </p>

                                        {/* Quantity Controls */}
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1, item.variantId)}
                                                    className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1, item.variantId)}
                                                    className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => onRemoveItem(item.productId, item.variantId)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
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
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                        {/* Discount Code */}
                        {!discountCode ? (
                            <div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={discountInput}
                                            onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                                            placeholder="Código de descuento"
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                        />
                                    </div>
                                    <button
                                        onClick={handleApplyDiscount}
                                        disabled={isApplyingDiscount || !discountInput.trim()}
                                        className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 transition-colors"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isApplyingDiscount ? '...' : 'Aplicar'}
                                    </button>
                                </div>
                                {discountError && (
                                    <p className="text-red-500 text-sm mt-1">{discountError}</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Tag className="text-green-600" size={18} />
                                    <span className="font-medium text-green-700 dark:text-green-400">
                                        {discountCode}
                                    </span>
                                    <span className="text-green-600 dark:text-green-400">
                                        (-{currencySymbol}{discountAmount.toFixed(2)})
                                    </span>
                                </div>
                                <button
                                    onClick={onRemoveDiscount}
                                    className="text-green-600 hover:text-green-700 dark:text-green-400"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        {/* Totals */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Descuento</span>
                                    <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {freeShippingThreshold > 0 && remainingForFreeShipping === 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Envío</span>
                                    <span>Gratis</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span>Total</span>
                                <span>{currencySymbol}{total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Checkout Button */}
                        <button
                            onClick={onCheckout}
                            className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Ir al Checkout
                            <ArrowRight size={20} />
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Seguir comprando
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;



