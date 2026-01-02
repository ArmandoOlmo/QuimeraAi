/**
 * CheckoutPageEnhanced
 * Premium checkout page with Stripe Elements integration
 * Features: Express Checkout, Address autocomplete, Real-time validation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    AddressElement,
    ExpressCheckoutElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import {
    ShoppingBag,
    CreditCard,
    Truck,
    User,
    Mail,
    Phone,
    MapPin,
    Lock,
    ChevronLeft,
    ChevronRight,
    Check,
    Loader2,
    AlertCircle,
    Shield,
    Tag,
    X,
    Plus,
    Minus,
    Percent,
    Gift,
    Clock,
    CheckCircle2,
    Wallet,
} from 'lucide-react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { CartItem, Address, Order, StoreSettings } from '../../types/ecommerce';

// =============================================================================
// TYPES
// =============================================================================

interface CheckoutPageEnhancedProps {
    storeId: string;
    onSuccess: (orderId: string) => void;
    onBack: () => void;
    onNavigateToStore: () => void;
}

interface CheckoutFormData {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    sameAsBilling: boolean;
    notes: string;
}

interface ShippingOption {
    id: string;
    name: string;
    description: string;
    price: number;
    estimatedDays: string;
}

type CheckoutStep = 'information' | 'shipping' | 'payment';

// =============================================================================
// STRIPE CHECKOUT FORM (Inner component with Stripe hooks)
// =============================================================================

interface StripeCheckoutFormProps {
    storeId: string;
    storeSettings: StoreSettings | null;
    cartItems: CartItem[];
    subtotal: number;
    discountCode: string;
    discountAmount: number;
    shippingCost: number;
    taxAmount: number;
    total: number;
    selectedShipping: ShippingOption | null;
    shippingOptions: ShippingOption[];
    formData: CheckoutFormData;
    currentStep: CheckoutStep;
    onFormDataChange: (field: string, value: string | boolean) => void;
    onStepChange: (step: CheckoutStep) => void;
    onShippingSelect: (option: ShippingOption) => void;
    onApplyDiscount: (code: string) => Promise<void>;
    onRemoveDiscount: () => void;
    onUpdateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    onRemoveItem: (productId: string, variantId?: string) => void;
    onSuccess: (orderId: string) => void;
    onBack: () => void;
}

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
    storeId,
    storeSettings,
    cartItems,
    subtotal,
    discountCode,
    discountAmount,
    shippingCost,
    taxAmount,
    total,
    selectedShipping,
    shippingOptions,
    formData,
    currentStep,
    onFormDataChange,
    onStepChange,
    onShippingSelect,
    onApplyDiscount,
    onRemoveDiscount,
    onUpdateQuantity,
    onRemoveItem,
    onSuccess,
    onBack,
}) => {
    const stripe = useStripe();
    const elements = useElements();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [discountInput, setDiscountInput] = useState('');
    const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
    const [paymentReady, setPaymentReady] = useState(false);
    const [addressComplete, setAddressComplete] = useState(false);

    const primaryColor = storeSettings?.storefrontTheme?.primaryColor || '#6366f1';
    const currencySymbol = storeSettings?.currencySymbol || '$';
    const storeName = storeSettings?.storeName || 'Tienda';
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const steps: { id: CheckoutStep; label: string; icon: React.ElementType }[] = [
        { id: 'information', label: 'Informacion', icon: User },
        { id: 'shipping', label: 'Envio', icon: Truck },
        { id: 'payment', label: 'Pago', icon: CreditCard },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

    const validateInformation = (): boolean => {
        return !!(
            formData.email &&
            formData.firstName &&
            formData.lastName &&
            formData.address1 &&
            formData.city &&
            formData.state &&
            formData.zipCode &&
            formData.country
        );
    };

    const handleApplyDiscount = async () => {
        if (!discountInput.trim()) return;
        setIsApplyingDiscount(true);
        try {
            await onApplyDiscount(discountInput.trim().toUpperCase());
            setDiscountInput('');
        } catch (err: any) {
            setError(err.message || 'Codigo de descuento invalido');
        } finally {
            setIsApplyingDiscount(false);
        }
    };

    const handleExpressCheckoutReady = () => {
        console.log('Express checkout ready');
    };

    const handleExpressCheckoutClick = async (event: any) => {
        if (!stripe || !elements) return;
        // Express checkout handles payment automatically
    };

    const handleExpressCheckoutConfirm = async (event: any) => {
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Create order first
            const orderId = await createOrder('express');
            
            // Confirm with express checkout
            const { error: confirmError } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/store/${storeId}/order/${orderId}`,
                },
            });

            if (confirmError) {
                setError(confirmError.message || 'Error procesando el pago');
                setIsProcessing(false);
            }
        } catch (err: any) {
            setError(err.message || 'Error procesando el pago');
            setIsProcessing(false);
        }
    };

    const createOrder = async (paymentMethod: string): Promise<string> => {
        // Get the owner of this store from publicStores (for multi-tenant)
        const publicStoreRef = doc(db, 'publicStores', storeId);
        const publicStoreDoc = await getDoc(publicStoreRef);
        const storeOwnerId = publicStoreDoc.data()?.userId;

        if (!storeOwnerId) {
            throw new Error('Store not found');
        }

        // Create order in public collection for guest checkout
        const ordersRef = collection(db, `publicStores/${storeId}/customerOrders`);
        
        const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
        
        const orderData = {
            orderNumber,
            customerId: null,
            customerEmail: formData.email,
            customerName: `${formData.firstName} ${formData.lastName}`,
            customerPhone: formData.phone || null,
            items: cartItems.map((item) => ({
                id: `${item.productId}-${item.variantId || 'default'}`,
                productId: item.productId,
                variantId: item.variantId || null,
                name: item.productName || item.name || 'Product',
                productName: item.productName || item.name || 'Product',
                variantName: item.variantName || null,
                imageUrl: item.image || item.imageUrl || null,
                image: item.image || item.imageUrl || null,
                quantity: item.quantity,
                unitPrice: item.price,
                price: item.price,
                totalPrice: item.price * item.quantity,
            })),
            subtotal,
            discount: discountAmount,
            discountCode: discountCode || null,
            discountAmount,
            shippingCost,
            shippingMethod: selectedShipping?.name || 'Standard',
            taxAmount,
            total,
            currency: storeSettings?.currency || 'USD',
            shippingAddress: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                address1: formData.address1,
                address2: formData.address2 || null,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                country: formData.country,
                phone: formData.phone || null,
            },
            billingAddress: formData.sameAsBilling ? null : {
                firstName: formData.firstName,
                lastName: formData.lastName,
                address1: formData.address1,
                address2: formData.address2 || null,
                city: formData.city,
                state: formData.state,
                zipCode: formData.zipCode,
                country: formData.country,
            },
            status: 'pending',
            paymentStatus: 'pending',
            fulfillmentStatus: 'unfulfilled',
            paymentMethod,
            notes: formData.notes || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const orderRef = await addDoc(ordersRef, orderData);
        return orderRef.id;
    };

    const handleSubmitPayment = async () => {
        if (!stripe || !elements) {
            setError('Stripe no esta inicializado');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Create order first
            const orderId = await createOrder('stripe');

            // Confirm payment
            const { error: confirmError } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/store/${storeId}/order/${orderId}`,
                },
                redirect: 'if_required',
            });

            if (confirmError) {
                setError(confirmError.message || 'Error procesando el pago');
                setIsProcessing(false);
            } else {
                // Payment successful without redirect
                onSuccess(orderId);
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setError(err.message || 'Error procesando el pago');
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ChevronLeft size={20} />
                            <span className="hidden sm:inline">Volver</span>
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {storeName}
                        </h1>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Lock size={16} />
                            <span className="text-sm hidden sm:inline">Pago seguro</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Progress Steps */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-center gap-2 sm:gap-4">
                        {steps.map((step, index) => {
                            const StepIcon = step.icon;
                            const isActive = step.id === currentStep;
                            const isCompleted = index < currentStepIndex;

                            return (
                                <React.Fragment key={step.id}>
                                    {index > 0 && (
                                        <div
                                            className={`h-0.5 w-8 sm:w-16 transition-colors ${
                                                isCompleted ? '' : 'bg-gray-200 dark:bg-gray-700'
                                            }`}
                                            style={isCompleted ? { backgroundColor: primaryColor } : {}}
                                        />
                                    )}
                                    <button
                                        onClick={() => {
                                            if (isCompleted || (index === currentStepIndex - 1)) {
                                                onStepChange(step.id);
                                            }
                                        }}
                                        disabled={!isCompleted && index > currentStepIndex}
                                        className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-full transition-all ${
                                            isActive
                                                ? 'text-white shadow-lg scale-105'
                                                : isCompleted
                                                ? 'text-white cursor-pointer hover:opacity-90'
                                                : 'text-gray-400 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                                        }`}
                                        style={isActive || isCompleted ? { backgroundColor: primaryColor } : {}}
                                    >
                                        {isCompleted ? (
                                            <Check size={16} />
                                        ) : (
                                            <StepIcon size={16} />
                                        )}
                                        <span className="font-medium text-sm hidden sm:inline">{step.label}</span>
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
                <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-start gap-3 animate-shake">
                                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-medium text-red-700 dark:text-red-400">Error</p>
                                    <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                                </div>
                                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                                    <X size={18} />
                                </button>
                            </div>
                        )}

                        {/* Express Checkout */}
                        {currentStep === 'information' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Wallet size={20} style={{ color: primaryColor }} />
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Checkout Express
                                    </h2>
                                </div>
                                <ExpressCheckoutElement
                                    onReady={handleExpressCheckoutReady}
                                    onClick={handleExpressCheckoutClick}
                                    onConfirm={handleExpressCheckoutConfirm}
                                    options={{
                                        paymentMethods: {
                                            applePay: 'auto',
                                            googlePay: 'auto',
                                            link: 'auto',
                                        },
                                    }}
                                />
                                <div className="relative my-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">
                                            o continua con tus datos
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Information Step */}
                        {currentStep === 'information' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
                                <div className="flex items-center gap-2">
                                    <User size={20} style={{ color: primaryColor }} />
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Informacion de Contacto
                                    </h2>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Email *
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => onFormDataChange('email', e.target.value)}
                                                placeholder="tu@email.com"
                                                required
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                Nombre *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.firstName}
                                                onChange={(e) => onFormDataChange('firstName', e.target.value)}
                                                placeholder="Juan"
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-shadow"
                                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                Apellido *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.lastName}
                                                onChange={(e) => onFormDataChange('lastName', e.target.value)}
                                                placeholder="Perez"
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-shadow"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Telefono
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => onFormDataChange('phone', e.target.value)}
                                                placeholder="+52 55 1234 5678"
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-shadow"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin size={20} style={{ color: primaryColor }} />
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                            Direccion de Envio
                                        </h2>
                                    </div>

                                    <AddressElement
                                        options={{
                                            mode: 'shipping',
                                            allowedCountries: ['MX', 'US', 'CA', 'ES'],
                                            blockPoBox: true,
                                            fields: {
                                                phone: 'always',
                                            },
                                            validation: {
                                                phone: {
                                                    required: 'never',
                                                },
                                            },
                                        }}
                                        onChange={(event) => {
                                            if (event.complete) {
                                                const address = event.value.address;
                                                onFormDataChange('address1', address.line1 || '');
                                                onFormDataChange('address2', address.line2 || '');
                                                onFormDataChange('city', address.city || '');
                                                onFormDataChange('state', address.state || '');
                                                onFormDataChange('zipCode', address.postal_code || '');
                                                onFormDataChange('country', address.country || 'MX');
                                                if (event.value.name) {
                                                    const names = event.value.name.split(' ');
                                                    onFormDataChange('firstName', names[0] || '');
                                                    onFormDataChange('lastName', names.slice(1).join(' ') || '');
                                                }
                                                if (event.value.phone) {
                                                    onFormDataChange('phone', event.value.phone);
                                                }
                                                setAddressComplete(true);
                                            } else {
                                                setAddressComplete(false);
                                            }
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={() => onStepChange('shipping')}
                                    disabled={!validateInformation() && !addressComplete}
                                    className="w-full py-3.5 rounded-xl text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    Continuar al envio
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}

                        {/* Shipping Step */}
                        {currentStep === 'shipping' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
                                <div className="flex items-center gap-2">
                                    <Truck size={20} style={{ color: primaryColor }} />
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Metodo de Envio
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    {shippingOptions.map((option) => (
                                        <label
                                            key={option.id}
                                            className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                                                selectedShipping?.id === option.id
                                                    ? 'border-2 shadow-md'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                            }`}
                                            style={selectedShipping?.id === option.id ? { borderColor: primaryColor } : {}}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                        selectedShipping?.id === option.id
                                                            ? ''
                                                            : 'border-gray-300 dark:border-gray-500'
                                                    }`}
                                                    style={selectedShipping?.id === option.id ? { borderColor: primaryColor } : {}}
                                                >
                                                    {selectedShipping?.id === option.id && (
                                                        <div
                                                            className="w-2.5 h-2.5 rounded-full"
                                                            style={{ backgroundColor: primaryColor }}
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        {option.name}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                        <Clock size={14} />
                                                        {option.estimatedDays}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {option.price === 0 ? (
                                                    <span className="text-green-600">Gratis</span>
                                                ) : (
                                                    `${currencySymbol}${option.price.toFixed(2)}`
                                                )}
                                            </span>
                                            <input
                                                type="radio"
                                                name="shipping"
                                                checked={selectedShipping?.id === option.id}
                                                onChange={() => onShippingSelect(option)}
                                                className="sr-only"
                                            />
                                        </label>
                                    ))}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => onStepChange('information')}
                                        className="flex-1 py-3.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ChevronLeft size={20} />
                                        Volver
                                    </button>
                                    <button
                                        onClick={() => onStepChange('payment')}
                                        disabled={!selectedShipping}
                                        className="flex-1 py-3.5 rounded-xl text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        Continuar al pago
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Payment Step */}
                        {currentStep === 'payment' && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
                                <div className="flex items-center gap-2">
                                    <CreditCard size={20} style={{ color: primaryColor }} />
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Metodo de Pago
                                    </h2>
                                </div>

                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                    <PaymentElement
                                        options={{
                                            layout: 'accordion',
                                        }}
                                        onReady={() => setPaymentReady(true)}
                                    />
                                </div>

                                {/* Order Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Notas del pedido (opcional)
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => onFormDataChange('notes', e.target.value)}
                                        rows={3}
                                        placeholder="Instrucciones especiales para la entrega..."
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-shadow resize-none"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => onStepChange('shipping')}
                                        className="flex-1 py-3.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ChevronLeft size={20} />
                                        Volver
                                    </button>
                                    <button
                                        onClick={handleSubmitPayment}
                                        disabled={isProcessing || !paymentReady}
                                        className="flex-1 py-3.5 rounded-xl text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={18} />
                                                Pagar {currencySymbol}{total.toFixed(2)}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Trust Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-6 py-4">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Shield size={20} />
                                <span className="text-sm">Pago 100% Seguro</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Lock size={20} />
                                <span className="text-sm">SSL Encriptado</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <CheckCircle2 size={20} />
                                <span className="text-sm">Garantia de Compra</span>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm sticky top-32 overflow-hidden">
                            {/* Summary Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <ShoppingBag size={20} style={{ color: primaryColor }} />
                                    Resumen ({itemCount} {itemCount === 1 ? 'producto' : 'productos'})
                                </h3>
                            </div>

                            {/* Cart Items */}
                            <div className="p-6 max-h-72 overflow-y-auto space-y-4">
                                {cartItems.map((item) => (
                                    <div
                                        key={`${item.productId}-${item.variantId || 'default'}`}
                                        className="flex gap-3 group"
                                    >
                                        <div className="relative flex-shrink-0">
                                            {item.image || item.imageUrl ? (
                                                <img
                                                    src={item.image || item.imageUrl}
                                                    alt={item.productName || item.name}
                                                    className="w-16 h-16 object-cover rounded-lg"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                    <ShoppingBag className="text-gray-400" size={20} />
                                                </div>
                                            )}
                                            <span
                                                className="absolute -top-2 -right-2 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {item.quantity}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {item.productName || item.name}
                                            </p>
                                            {item.variantName && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {item.variantName}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <button
                                                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1, item.variantId)}
                                                    className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="text-sm text-gray-600 dark:text-gray-400 w-6 text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1, item.variantId)}
                                                    className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                                <button
                                                    onClick={() => onRemoveItem(item.productId, item.variantId)}
                                                    className="ml-auto text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Discount Code */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                {discountCode ? (
                                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-500/10 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Tag className="text-green-600" size={18} />
                                            <span className="font-medium text-green-700 dark:text-green-400">
                                                {discountCode}
                                            </span>
                                        </div>
                                        <button
                                            onClick={onRemoveDiscount}
                                            className="text-green-600 hover:text-green-800"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={discountInput}
                                                onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                                                placeholder="Codigo de descuento"
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2"
                                            />
                                        </div>
                                        <button
                                            onClick={handleApplyDiscount}
                                            disabled={isApplyingDiscount || !discountInput.trim()}
                                            className="px-4 py-2.5 rounded-lg font-medium text-white disabled:opacity-50 transition-colors"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {isApplyingDiscount ? (
                                                <Loader2 className="animate-spin" size={18} />
                                            ) : (
                                                'Aplicar'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Totals */}
                            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>Subtotal</span>
                                    <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span className="flex items-center gap-1">
                                            <Percent size={14} />
                                            Descuento
                                        </span>
                                        <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>Envio</span>
                                    <span>
                                        {shippingCost === 0 ? (
                                            <span className="text-green-600">Gratis</span>
                                        ) : (
                                            `${currencySymbol}${shippingCost.toFixed(2)}`
                                        )}
                                    </span>
                                </div>
                                {taxAmount > 0 && (
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                        <span>Impuestos</span>
                                        <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <span>Total</span>
                                    <span style={{ color: primaryColor }}>
                                        {currencySymbol}{total.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// MAIN CHECKOUT PAGE COMPONENT
// =============================================================================

const CheckoutPageEnhanced: React.FC<CheckoutPageEnhancedProps> = ({
    storeId,
    onSuccess,
    onBack,
    onNavigateToStore,
}) => {
    const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stripePromise, setStripePromise] = useState<any>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<CheckoutStep>('information');

    // Form data
    const [formData, setFormData] = useState<CheckoutFormData>({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'MX',
        sameAsBilling: true,
        notes: '',
    });

    // Pricing
    const [discountCode, setDiscountCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);

    // Default shipping options
    const shippingOptions: ShippingOption[] = useMemo(() => {
        const options: ShippingOption[] = [
            {
                id: 'standard',
                name: 'Envio Estandar',
                description: 'Entrega en 5-7 dias habiles',
                price: 99,
                estimatedDays: '5-7 dias habiles',
            },
            {
                id: 'express',
                name: 'Envio Express',
                description: 'Entrega en 2-3 dias habiles',
                price: 199,
                estimatedDays: '2-3 dias habiles',
            },
            {
                id: 'overnight',
                name: 'Entrega al Siguiente Dia',
                description: 'Entrega garantizada manana',
                price: 349,
                estimatedDays: '1 dia habil',
            },
        ];

        // Check for free shipping threshold
        const freeThreshold = storeSettings?.freeShippingThreshold || 500;
        const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        if (subtotal >= freeThreshold) {
            options[0].price = 0;
            options[0].name = 'Envio Gratis';
        }

        return options;
    }, [storeSettings, cartItems]);

    // Calculate totals
    const subtotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [cartItems]);

    const taxRate = storeSettings?.taxRate || 0;
    const taxAmount = useMemo(() => {
        if (!storeSettings?.taxEnabled) return 0;
        return (subtotal - discountAmount) * (taxRate / 100);
    }, [subtotal, discountAmount, taxRate, storeSettings]);

    const shippingCost = selectedShipping?.price || 0;

    const total = useMemo(() => {
        return Math.max(0, subtotal - discountAmount + shippingCost + taxAmount);
    }, [subtotal, discountAmount, shippingCost, taxAmount]);

    // Load store settings and cart
    useEffect(() => {
        const loadData = async () => {
            try {
                // Get store settings from publicStores
                const publicStoreRef = doc(db, 'publicStores', storeId);
                const publicStoreDoc = await getDoc(publicStoreRef);

                if (!publicStoreDoc.exists()) {
                    console.error('Store not found in publicStores');
                    onBack();
                    return;
                }

                const storeOwnerId = publicStoreDoc.data()?.userId;

                // Get store settings from publicStores (publicly accessible)
                const settingsRef = doc(db, `publicStores/${storeId}/settings/store`);
                const settingsDoc = await getDoc(settingsRef);
                
                if (settingsDoc.exists()) {
                    setStoreSettings(settingsDoc.data() as StoreSettings);
                }

                // Initialize Stripe
                const publishableKey = settingsDoc.data()?.stripePublishableKey || 
                    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

                if (publishableKey) {
                    const stripe = loadStripe(publishableKey);
                    setStripePromise(stripe);
                }

                // Get cart from localStorage for now (can be enhanced with Firestore)
                const savedCart = localStorage.getItem(`cart_${storeId}`);
                if (savedCart) {
                    const cart = JSON.parse(savedCart);
                    setCartItems(cart.items || []);
                }

                // Create payment intent
                if (publishableKey) {
                    try {
                        const createPaymentIntentFn = httpsCallable(functions, 'createPaymentIntent');
                        
                        // Calculate initial total
                        const cart = savedCart ? JSON.parse(savedCart) : { items: [] };
                        const items = cart.items || [];
                        const initialSubtotal = items.reduce((sum: number, item: CartItem) => 
                            sum + item.price * item.quantity, 0
                        );

                        if (initialSubtotal > 0) {
                            const response = await createPaymentIntentFn({
                                userId: storeOwnerId,
                                storeId,
                                orderId: `temp-${Date.now()}`,
                                amount: Math.round(initialSubtotal * 100),
                                currency: settingsDoc.data()?.currency?.toLowerCase() || 'mxn',
                                customerEmail: 'pending@checkout.com',
                                customerName: 'Pending Customer',
                            });

                            const data = response.data as any;
                            if (data?.clientSecret) {
                                setClientSecret(data.clientSecret);
                            }
                        }
                    } catch (err) {
                        console.error('Error creating payment intent:', err);
                        // Continue anyway - we'll create it when needed
                    }
                }

                setIsLoading(false);
            } catch (error) {
                console.error('Error loading checkout data:', error);
                setIsLoading(false);
            }
        };

        loadData();
    }, [storeId, onBack]);

    // Set default shipping
    useEffect(() => {
        if (shippingOptions.length > 0 && !selectedShipping) {
            setSelectedShipping(shippingOptions[0]);
        }
    }, [shippingOptions, selectedShipping]);

    const handleFormDataChange = useCallback((field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleApplyDiscount = useCallback(async (code: string) => {
        // Validate discount code (simplified - should call backend)
        if (code === 'WELCOME10') {
            setDiscountCode(code);
            setDiscountAmount(subtotal * 0.1);
        } else if (code === 'SAVE20') {
            setDiscountCode(code);
            setDiscountAmount(subtotal * 0.2);
        } else {
            throw new Error('Codigo de descuento invalido');
        }
    }, [subtotal]);

    const handleRemoveDiscount = useCallback(() => {
        setDiscountCode('');
        setDiscountAmount(0);
    }, []);

    const handleUpdateQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
        if (quantity <= 0) {
            handleRemoveItem(productId, variantId);
            return;
        }

        setCartItems((prev) => {
            const newItems = prev.map((item) => {
                if (item.productId === productId && item.variantId === variantId) {
                    return { ...item, quantity };
                }
                return item;
            });

            // Save to localStorage
            localStorage.setItem(`cart_${storeId}`, JSON.stringify({ items: newItems }));
            return newItems;
        });
    }, [storeId]);

    const handleRemoveItem = useCallback((productId: string, variantId?: string) => {
        setCartItems((prev) => {
            const newItems = prev.filter(
                (item) => !(item.productId === productId && item.variantId === variantId)
            );

            // Save to localStorage
            localStorage.setItem(`cart_${storeId}`, JSON.stringify({ items: newItems }));

            // If cart is empty, redirect to store
            if (newItems.length === 0) {
                onNavigateToStore();
            }

            return newItems;
        });
    }, [storeId, onNavigateToStore]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Cargando checkout...</p>
                </div>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="text-center max-w-md">
                    <ShoppingBag className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Tu carrito esta vacio
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Agrega algunos productos para continuar con tu compra
                    </p>
                    <button
                        onClick={onNavigateToStore}
                        className="px-6 py-3 rounded-xl text-white font-bold transition-all hover:shadow-lg"
                        style={{ backgroundColor: storeSettings?.storefrontTheme?.primaryColor || '#6366f1' }}
                    >
                        Explorar Productos
                    </button>
                </div>
            </div>
        );
    }

    if (!stripePromise) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-20 h-20 text-amber-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Pagos no configurados
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        El sistema de pagos no esta configurado para esta tienda
                    </p>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    const primaryColor = storeSettings?.storefrontTheme?.primaryColor || '#6366f1';

    return (
        <Elements
            stripe={stripePromise}
            options={{
                mode: 'payment',
                amount: Math.round(total * 100),
                currency: storeSettings?.currency?.toLowerCase() || 'mxn',
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: primaryColor,
                        borderRadius: '12px',
                        fontFamily: 'Inter, system-ui, sans-serif',
                    },
                    rules: {
                        '.Input': {
                            padding: '12px 16px',
                        },
                        '.Label': {
                            fontWeight: '500',
                            marginBottom: '8px',
                        },
                    },
                },
            }}
        >
            <StripeCheckoutForm
                storeId={storeId}
                storeSettings={storeSettings}
                cartItems={cartItems}
                subtotal={subtotal}
                discountCode={discountCode}
                discountAmount={discountAmount}
                shippingCost={shippingCost}
                taxAmount={taxAmount}
                total={total}
                selectedShipping={selectedShipping}
                shippingOptions={shippingOptions}
                formData={formData}
                currentStep={currentStep}
                onFormDataChange={handleFormDataChange}
                onStepChange={setCurrentStep}
                onShippingSelect={setSelectedShipping}
                onApplyDiscount={handleApplyDiscount}
                onRemoveDiscount={handleRemoveDiscount}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onSuccess={onSuccess}
                onBack={onBack}
            />
        </Elements>
    );
};

export default CheckoutPageEnhanced;











