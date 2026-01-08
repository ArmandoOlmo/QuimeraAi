/**
 * CartSection Component
 * 
 * A section component that renders a full-page cart view.
 * Used as a standalone cart page instead of the drawer.
 */

import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Tag, ArrowRight, ShoppingBag } from 'lucide-react';
import { useSafeStorefrontCart } from '../context';

interface CartSectionProps {
    /** Store ID */
    storeId: string;
    /** Primary accent color */
    primaryColor?: string;
    /** Custom colors */
    colors?: {
        background?: string;
        heading?: string;
        text?: string;
        cardBackground?: string;
        cardText?: string;
        accent?: string;
        border?: string;
        priceColor?: string;
        buttonBackground?: string;
        buttonText?: string;
    };
    /** Free shipping threshold */
    freeShippingThreshold?: number;
    /** Navigation callbacks */
    onContinueShopping?: () => void;
    onCheckout?: () => void;
}

/**
 * CartSection
 * 
 * Renders a full-page cart with items, quantity controls, discounts, and checkout CTA.
 */
const CartSection: React.FC<CartSectionProps> = ({
    storeId,
    primaryColor = '#6366f1',
    colors = {},
    freeShippingThreshold = 500,
    onContinueShopping = () => window.location.href = '/tienda',
    onCheckout = () => window.location.href = '/checkout',
}) => {
    const cart = useSafeStorefrontCart();
    
    const {
        background = 'transparent',
        heading = '#ffffff',
        text = '#94a3b8',
        cardBackground = '#1e293b',
        cardText = '#ffffff',
        accent = primaryColor,
        border = '#334155',
        priceColor = '#ffffff',
        buttonBackground = primaryColor,
        buttonText = '#ffffff',
    } = colors;

    const progressToFreeShipping = Math.min((cart.subtotal / freeShippingThreshold) * 100, 100);
    const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cart.subtotal);

    if (cart.items.length === 0) {
        return (
            <section 
                id="cart" 
                className="cart-section min-h-[60vh] py-16"
                style={{ backgroundColor: background }}
            >
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center py-16">
                        <ShoppingBag size={64} className="mx-auto mb-6" style={{ color: text }} />
                        <h2 className="text-2xl font-bold mb-4" style={{ color: heading }}>
                            Tu carrito está vacío
                        </h2>
                        <p className="mb-8" style={{ color: text }}>
                            Parece que aún no has agregado productos a tu carrito.
                        </p>
                        <button
                            onClick={onContinueShopping}
                            className="px-8 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
                            style={{ backgroundColor: buttonBackground, color: buttonText }}
                        >
                            Explorar Tienda
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section 
            id="cart" 
            className="cart-section py-16"
            style={{ backgroundColor: background }}
        >
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <ShoppingCart size={28} style={{ color: accent }} />
                    <h1 className="text-3xl font-bold" style={{ color: heading }}>
                        Tu Carrito ({cart.itemCount} {cart.itemCount === 1 ? 'producto' : 'productos'})
                    </h1>
                </div>

                {/* Free Shipping Progress */}
                {freeShippingThreshold > 0 && (
                    <div className="mb-8 p-4 rounded-lg" style={{ backgroundColor: cardBackground }}>
                        {remainingForFreeShipping > 0 ? (
                            <p className="text-sm mb-2" style={{ color: text }}>
                                ¡Agrega <span className="font-bold" style={{ color: accent }}>${remainingForFreeShipping.toFixed(2)}</span> más para envío gratis!
                            </p>
                        ) : (
                            <p className="text-sm mb-2 font-medium" style={{ color: accent }}>
                                🎉 ¡Felicidades! Tienes envío gratis
                            </p>
                        )}
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: border }}>
                            <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                    width: `${progressToFreeShipping}%`,
                                    backgroundColor: accent 
                                }}
                            />
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {cart.items.map((item) => (
                            <div 
                                key={item.id}
                                className="flex gap-4 p-4 rounded-lg"
                                style={{ backgroundColor: cardBackground, borderColor: border, borderWidth: 1 }}
                            >
                                {/* Product Image */}
                                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                    {item.image ? (
                                        <img 
                                            src={item.image} 
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div 
                                            className="w-full h-full flex items-center justify-center"
                                            style={{ backgroundColor: border }}
                                        >
                                            <ShoppingBag size={24} style={{ color: text }} />
                                        </div>
                                    )}
                                </div>

                                {/* Product Details */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold truncate" style={{ color: cardText }}>
                                        {item.name}
                                    </h3>
                                    {item.variant && (
                                        <p className="text-sm mt-1" style={{ color: text }}>
                                            {item.variant}
                                        </p>
                                    )}
                                    <p className="text-lg font-bold mt-2" style={{ color: priceColor }}>
                                        ${item.price.toFixed(2)}
                                    </p>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex flex-col items-end justify-between">
                                    <button
                                        onClick={() => cart.removeItem(item.id)}
                                        className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
                                        style={{ color: text }}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                            className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: border, color: cardText }}
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center font-medium" style={{ color: cardText }}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                                            className="p-2 rounded-lg transition-colors"
                                            style={{ backgroundColor: border, color: cardText }}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div 
                            className="p-6 rounded-xl sticky top-24"
                            style={{ backgroundColor: cardBackground, borderColor: border, borderWidth: 1 }}
                        >
                            <h3 className="text-lg font-bold mb-6" style={{ color: cardText }}>
                                Resumen del Pedido
                            </h3>

                            {/* Discount Code */}
                            <div className="mb-6">
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: text }} />
                                        <input
                                            type="text"
                                            placeholder="Código de descuento"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none focus:ring-2"
                                            style={{ 
                                                backgroundColor: border, 
                                                color: cardText,
                                                '--tw-ring-color': accent
                                            } as React.CSSProperties}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    cart.applyDiscount((e.target as HTMLInputElement).value);
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        className="px-4 py-2 rounded-lg font-medium transition-colors"
                                        style={{ backgroundColor: accent, color: buttonText }}
                                    >
                                        Aplicar
                                    </button>
                                </div>
                                {cart.discountCode && (
                                    <div className="mt-2 flex items-center justify-between text-sm" style={{ color: accent }}>
                                        <span>Código: {cart.discountCode}</span>
                                        <button 
                                            onClick={cart.removeDiscount}
                                            className="hover:underline"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Totals */}
                            <div className="space-y-3 pt-4" style={{ borderTopColor: border, borderTopWidth: 1 }}>
                                <div className="flex justify-between" style={{ color: text }}>
                                    <span>Subtotal</span>
                                    <span>${cart.subtotal.toFixed(2)}</span>
                                </div>
                                {cart.discountAmount > 0 && (
                                    <div className="flex justify-between" style={{ color: accent }}>
                                        <span>Descuento</span>
                                        <span>-${cart.discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between" style={{ color: text }}>
                                    <span>Envío</span>
                                    <span>{remainingForFreeShipping <= 0 ? 'Gratis' : 'Calculado en checkout'}</span>
                                </div>
                                <div 
                                    className="flex justify-between text-lg font-bold pt-3"
                                    style={{ color: cardText, borderTopColor: border, borderTopWidth: 1 }}
                                >
                                    <span>Total</span>
                                    <span style={{ color: priceColor }}>
                                        ${(cart.subtotal - cart.discountAmount).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Checkout Button */}
                            <button
                                onClick={onCheckout}
                                className="w-full mt-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all hover:opacity-90"
                                style={{ backgroundColor: buttonBackground, color: buttonText }}
                            >
                                Finalizar Compra
                                <ArrowRight size={20} />
                            </button>

                            {/* Continue Shopping */}
                            <button
                                onClick={onContinueShopping}
                                className="w-full mt-3 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                                style={{ color: accent }}
                            >
                                Continuar Comprando
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CartSection;



