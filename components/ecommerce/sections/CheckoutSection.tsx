/**
 * CheckoutSection Component
 * 
 * A section component that renders a full checkout page.
 * Handles shipping info, payment method selection, and order confirmation.
 */

import React, { useState } from 'react';
import { 
    CreditCard, 
    Truck, 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Building2, 
    ChevronRight,
    Lock,
    ShoppingBag,
    AlertCircle
} from 'lucide-react';
import { useSafeStorefrontCart } from '../context';

interface CheckoutSectionProps {
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
        inputBackground?: string;
        inputText?: string;
    };
    /** Available payment methods */
    paymentMethods?: Array<{
        id: string;
        name: string;
        icon: string;
        description?: string;
    }>;
    /** Navigation callbacks */
    onBackToCart?: () => void;
    onOrderComplete?: (orderId: string) => void;
}

interface ShippingInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

/**
 * CheckoutSection
 * 
 * Renders a multi-step checkout form with shipping and payment.
 */
const CheckoutSection: React.FC<CheckoutSectionProps> = ({
    storeId,
    primaryColor = '#6366f1',
    colors = {},
    paymentMethods = [
        { id: 'card', name: 'Tarjeta de Crédito/Débito', icon: 'credit-card' },
        { id: 'paypal', name: 'PayPal', icon: 'paypal' },
        { id: 'transfer', name: 'Transferencia Bancaria', icon: 'bank' },
    ],
    onBackToCart = () => window.location.href = '/carrito',
    onOrderComplete = (orderId) => window.location.href = `/pedido/${orderId}`,
}) => {
    const cart = useSafeStorefrontCart();
    
    const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
    const [selectedPayment, setSelectedPayment] = useState<string>('card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'México',
    });
    const [errors, setErrors] = useState<Partial<ShippingInfo>>({});

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
        inputBackground = '#0f172a',
        inputText = '#ffffff',
    } = colors;

    const validateShipping = (): boolean => {
        const newErrors: Partial<ShippingInfo> = {};
        
        if (!shippingInfo.firstName) newErrors.firstName = 'Requerido';
        if (!shippingInfo.lastName) newErrors.lastName = 'Requerido';
        if (!shippingInfo.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email)) {
            newErrors.email = 'Email inválido';
        }
        if (!shippingInfo.phone) newErrors.phone = 'Requerido';
        if (!shippingInfo.address) newErrors.address = 'Requerido';
        if (!shippingInfo.city) newErrors.city = 'Requerido';
        if (!shippingInfo.state) newErrors.state = 'Requerido';
        if (!shippingInfo.zipCode) newErrors.zipCode = 'Requerido';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleContinue = () => {
        if (step === 'shipping') {
            if (validateShipping()) {
                setStep('payment');
            }
        } else if (step === 'payment') {
            setStep('review');
        }
    };

    const handleSubmitOrder = async () => {
        setIsProcessing(true);
        
        try {
            // Simulate order processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate order ID
            const orderId = `ORD-${Date.now()}`;
            
            // Clear cart
            cart.clearCart?.();
            
            // Redirect to confirmation
            onOrderComplete(orderId);
        } catch (error) {
            console.error('Error processing order:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    if (cart.items.length === 0) {
        return (
            <section 
                id="checkout" 
                className="checkout-section min-h-[60vh] py-16"
                style={{ backgroundColor: background }}
            >
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center py-16">
                        <ShoppingBag size={64} className="mx-auto mb-6" style={{ color: text }} />
                        <h2 className="text-2xl font-bold mb-4" style={{ color: heading }}>
                            Tu carrito está vacío
                        </h2>
                        <p className="mb-8" style={{ color: text }}>
                            No puedes completar el checkout sin productos.
                        </p>
                        <button
                            onClick={onBackToCart}
                            className="px-8 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
                            style={{ backgroundColor: buttonBackground, color: buttonText }}
                        >
                            Ir al Carrito
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    const InputField: React.FC<{
        label: string;
        name: keyof ShippingInfo;
        type?: string;
        icon: React.ReactNode;
        placeholder?: string;
    }> = ({ label, name, type = 'text', icon, placeholder }) => (
        <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: text }}>
                {label}
            </label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: text }}>
                    {icon}
                </span>
                <input
                    type={type}
                    value={shippingInfo[name]}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, [name]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3 rounded-lg outline-none focus:ring-2"
                    style={{ 
                        backgroundColor: inputBackground, 
                        color: inputText,
                        borderColor: errors[name] ? '#ef4444' : border,
                        borderWidth: 1,
                        '--tw-ring-color': accent
                    } as React.CSSProperties}
                />
            </div>
            {errors[name] && (
                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors[name]}
                </p>
            )}
        </div>
    );

    return (
        <section 
            id="checkout" 
            className="checkout-section py-16"
            style={{ backgroundColor: background }}
        >
            <div className="container mx-auto px-4 max-w-6xl">
                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-4 mb-12">
                    {['shipping', 'payment', 'review'].map((s, i) => (
                        <React.Fragment key={s}>
                            <div 
                                className={`flex items-center gap-2 ${step === s ? 'opacity-100' : 'opacity-50'}`}
                            >
                                <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                                    style={{ 
                                        backgroundColor: step === s ? accent : border,
                                        color: step === s ? buttonText : text
                                    }}
                                >
                                    {i + 1}
                                </div>
                                <span className="hidden sm:block font-medium" style={{ color: step === s ? heading : text }}>
                                    {s === 'shipping' ? 'Envío' : s === 'payment' ? 'Pago' : 'Revisar'}
                                </span>
                            </div>
                            {i < 2 && (
                                <ChevronRight size={20} style={{ color: border }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <div 
                            className="p-6 rounded-xl"
                            style={{ backgroundColor: cardBackground, borderColor: border, borderWidth: 1 }}
                        >
                            {/* Shipping Step */}
                            {step === 'shipping' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: cardText }}>
                                        <Truck size={24} style={{ color: accent }} />
                                        Información de Envío
                                    </h2>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <InputField 
                                            label="Nombre" 
                                            name="firstName" 
                                            icon={<User size={16} />}
                                            placeholder="Juan"
                                        />
                                        <InputField 
                                            label="Apellido" 
                                            name="lastName" 
                                            icon={<User size={16} />}
                                            placeholder="Pérez"
                                        />
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <InputField 
                                            label="Email" 
                                            name="email" 
                                            type="email"
                                            icon={<Mail size={16} />}
                                            placeholder="juan@ejemplo.com"
                                        />
                                        <InputField 
                                            label="Teléfono" 
                                            name="phone" 
                                            type="tel"
                                            icon={<Phone size={16} />}
                                            placeholder="+52 555 123 4567"
                                        />
                                    </div>

                                    <InputField 
                                        label="Dirección" 
                                        name="address" 
                                        icon={<MapPin size={16} />}
                                        placeholder="Calle, número, colonia"
                                    />

                                    <div className="grid sm:grid-cols-3 gap-4">
                                        <InputField 
                                            label="Ciudad" 
                                            name="city" 
                                            icon={<Building2 size={16} />}
                                            placeholder="Ciudad de México"
                                        />
                                        <InputField 
                                            label="Estado" 
                                            name="state" 
                                            icon={<Building2 size={16} />}
                                            placeholder="CDMX"
                                        />
                                        <InputField 
                                            label="Código Postal" 
                                            name="zipCode" 
                                            icon={<MapPin size={16} />}
                                            placeholder="01000"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Payment Step */}
                            {step === 'payment' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: cardText }}>
                                        <CreditCard size={24} style={{ color: accent }} />
                                        Método de Pago
                                    </h2>

                                    <div className="space-y-3">
                                        {paymentMethods.map((method) => (
                                            <button
                                                key={method.id}
                                                onClick={() => setSelectedPayment(method.id)}
                                                className="w-full p-4 rounded-lg flex items-center gap-4 transition-all"
                                                style={{
                                                    backgroundColor: selectedPayment === method.id ? `${accent}15` : inputBackground,
                                                    borderColor: selectedPayment === method.id ? accent : border,
                                                    borderWidth: 2,
                                                }}
                                            >
                                                <div 
                                                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                                                    style={{ borderColor: selectedPayment === method.id ? accent : border }}
                                                >
                                                    {selectedPayment === method.id && (
                                                        <div 
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: accent }}
                                                        />
                                                    )}
                                                </div>
                                                <CreditCard size={24} style={{ color: accent }} />
                                                <div className="text-left">
                                                    <p className="font-medium" style={{ color: cardText }}>
                                                        {method.name}
                                                    </p>
                                                    {method.description && (
                                                        <p className="text-sm" style={{ color: text }}>
                                                            {method.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div 
                                        className="flex items-center gap-2 p-4 rounded-lg"
                                        style={{ backgroundColor: `${accent}15` }}
                                    >
                                        <Lock size={16} style={{ color: accent }} />
                                        <p className="text-sm" style={{ color: text }}>
                                            Tu información de pago está protegida con encriptación SSL
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Review Step */}
                            {step === 'review' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold" style={{ color: cardText }}>
                                        Revisar Pedido
                                    </h2>

                                    {/* Shipping Summary */}
                                    <div className="p-4 rounded-lg" style={{ backgroundColor: inputBackground }}>
                                        <h3 className="font-medium mb-2" style={{ color: cardText }}>
                                            Enviar a:
                                        </h3>
                                        <p style={{ color: text }}>
                                            {shippingInfo.firstName} {shippingInfo.lastName}<br />
                                            {shippingInfo.address}<br />
                                            {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}<br />
                                            {shippingInfo.phone}
                                        </p>
                                    </div>

                                    {/* Items Summary */}
                                    <div className="space-y-3">
                                        {cart.items.map((item) => (
                                            <div 
                                                key={item.id}
                                                className="flex items-center gap-3 p-3 rounded-lg"
                                                style={{ backgroundColor: inputBackground }}
                                            >
                                                <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div 
                                                            className="w-full h-full flex items-center justify-center"
                                                            style={{ backgroundColor: border }}
                                                        >
                                                            <ShoppingBag size={16} style={{ color: text }} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate" style={{ color: cardText }}>
                                                        {item.name}
                                                    </p>
                                                    <p className="text-sm" style={{ color: text }}>
                                                        Cantidad: {item.quantity}
                                                    </p>
                                                </div>
                                                <p className="font-bold" style={{ color: priceColor }}>
                                                    ${(item.price * item.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-8 pt-6" style={{ borderTopColor: border, borderTopWidth: 1 }}>
                                <button
                                    onClick={() => {
                                        if (step === 'shipping') onBackToCart();
                                        else if (step === 'payment') setStep('shipping');
                                        else setStep('payment');
                                    }}
                                    className="px-6 py-3 rounded-lg font-medium transition-colors hover:opacity-80"
                                    style={{ color: text }}
                                >
                                    {step === 'shipping' ? 'Volver al Carrito' : 'Atrás'}
                                </button>

                                {step !== 'review' ? (
                                    <button
                                        onClick={handleContinue}
                                        className="px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all hover:opacity-90"
                                        style={{ backgroundColor: buttonBackground, color: buttonText }}
                                    >
                                        Continuar
                                        <ChevronRight size={20} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmitOrder}
                                        disabled={isProcessing}
                                        className="px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                                        style={{ backgroundColor: buttonBackground, color: buttonText }}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={20} />
                                                Confirmar Pedido
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div 
                            className="p-6 rounded-xl sticky top-24"
                            style={{ backgroundColor: cardBackground, borderColor: border, borderWidth: 1 }}
                        >
                            <h3 className="text-lg font-bold mb-6" style={{ color: cardText }}>
                                Resumen ({cart.itemCount} productos)
                            </h3>

                            <div className="space-y-3 pb-4 mb-4" style={{ borderBottomColor: border, borderBottomWidth: 1 }}>
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
                                    <span>Gratis</span>
                                </div>
                            </div>

                            <div className="flex justify-between text-xl font-bold" style={{ color: cardText }}>
                                <span>Total</span>
                                <span style={{ color: priceColor }}>
                                    ${(cart.subtotal - cart.discountAmount).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CheckoutSection;



