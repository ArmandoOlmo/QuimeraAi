/**
 * CheckoutPage
 * Página de checkout para el storefront
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ShoppingBag,
    CreditCard,
    Truck,
    User,
    Mail,
    Phone,
    MapPin,
    Building,
    Lock,
    ChevronLeft,
    Check,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { CartItem, Address } from '../../types/ecommerce';

interface CheckoutPageProps {
    items: CartItem[];
    subtotal: number;
    discountCode?: string;
    discountAmount?: number;
    shippingCost: number;
    taxAmount: number;
    onBack: () => void;
    onSubmitOrder: (orderData: CheckoutOrderData) => Promise<{ success: boolean; orderId?: string; error?: string }>;
    currencySymbol?: string;
    primaryColor?: string;
    storeName?: string;
    requiresShipping?: boolean;
}

export interface CheckoutOrderData {
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    shippingAddress: Address;
    billingAddress?: Address;
    sameAsBilling: boolean;
    notes?: string;
    paymentMethod: 'stripe' | 'paypal' | 'cod';
}

type CheckoutStep = 'information' | 'shipping' | 'payment';

const CheckoutPage: React.FC<CheckoutPageProps> = ({
    items,
    subtotal,
    discountCode,
    discountAmount = 0,
    shippingCost,
    taxAmount,
    onBack,
    onSubmitOrder,
    currencySymbol = '$',
    primaryColor = '#6366f1',
    storeName = 'Tu Tienda',
    requiresShipping = true,
}) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState<CheckoutStep>('information');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'México',
        sameAsBilling: true,
        notes: '',
        paymentMethod: 'stripe' as 'stripe' | 'paypal' | 'cod',
    });

    const [billingAddress, setBillingAddress] = useState({
        firstName: '',
        lastName: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'México',
    });

    const total = subtotal - discountAmount + shippingCost + taxAmount;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const updateFormData = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const updateBillingAddress = (field: string, value: string) => {
        setBillingAddress((prev) => ({ ...prev, [field]: value }));
    };

    const validateStep = (step: CheckoutStep): boolean => {
        switch (step) {
            case 'information':
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
            case 'shipping':
                return true; // Shipping method selection
            case 'payment':
                return !!formData.paymentMethod;
            default:
                return false;
        }
    };

    const handleNextStep = () => {
        if (currentStep === 'information' && validateStep('information')) {
            setCurrentStep(requiresShipping ? 'shipping' : 'payment');
        } else if (currentStep === 'shipping') {
            setCurrentStep('payment');
        }
    };

    const handleSubmit = async () => {
        if (!validateStep('payment')) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const orderData: CheckoutOrderData = {
                customerEmail: formData.email,
                customerName: `${formData.firstName} ${formData.lastName}`,
                customerPhone: formData.phone || undefined,
                shippingAddress: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    address1: formData.address1,
                    address2: formData.address2 || undefined,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    country: formData.country,
                    phone: formData.phone || undefined,
                },
                billingAddress: formData.sameAsBilling ? undefined : billingAddress,
                sameAsBilling: formData.sameAsBilling,
                notes: formData.notes || undefined,
                paymentMethod: formData.paymentMethod,
            };

            const result = await onSubmitOrder(orderData);

            if (!result.success) {
                setError(result.error || 'Error al procesar el pedido');
            }
        } catch (err: any) {
            setError(err.message || 'Error al procesar el pedido');
        } finally {
            setIsSubmitting(false);
        }
    };

    const steps = [
        { id: 'information', label: t('ecommerce.storefront.checkout.stepInfo'), icon: User },
        ...(requiresShipping ? [{ id: 'shipping', label: t('ecommerce.storefront.checkout.stepShipping'), icon: Truck }] : []),
        { id: 'payment', label: t('ecommerce.storefront.checkout.stepPayment'), icon: CreditCard },
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ChevronLeft size={20} />
                            <span>{t('ecommerce.storefront.checkout.backToCart')}</span>
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {storeName}
                        </h1>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Lock size={16} />
                            <span className="text-sm">{t('ecommerce.storefront.checkout.securePayment')}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Progress Steps */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-center gap-4">
                        {steps.map((step, index) => {
                            const StepIcon = step.icon;
                            const isActive = step.id === currentStep;
                            const isCompleted = index < currentStepIndex;

                            return (
                                <React.Fragment key={step.id}>
                                    {index > 0 && (
                                        <div
                                            className={`h-0.5 w-16 transition-colors ${
                                                isCompleted ? '' : 'bg-gray-200 dark:bg-gray-700'
                                            }`}
                                            style={isCompleted ? { backgroundColor: primaryColor } : {}}
                                        />
                                    )}
                                    <div
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                                            isActive
                                                ? 'text-white'
                                                : isCompleted
                                                ? 'text-white'
                                                : 'text-gray-400 bg-gray-100 dark:bg-gray-700'
                                        }`}
                                        style={isActive || isCompleted ? { backgroundColor: primaryColor } : {}}
                                    >
                                        {isCompleted ? (
                                            <Check size={18} />
                                        ) : (
                                            <StepIcon size={18} />
                                        )}
                                        <span className="font-medium hidden sm:inline">{step.label}</span>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-3">
                                <AlertCircle className="text-red-500" size={20} />
                                <p className="text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Information Step */}
                        {currentStep === 'information' && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <User size={20} style={{ color: primaryColor }} />
                                    {t('ecommerce.storefront.checkout.contactInfo')}
                                </h2>

                                <div className="grid gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('ecommerce.storefront.checkout.email')} *
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => updateFormData('email', e.target.value)}
                                                required
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('ecommerce.storefront.checkout.firstName')} *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.firstName}
                                                onChange={(e) => updateFormData('firstName', e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('ecommerce.storefront.checkout.lastName')} *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.lastName}
                                                onChange={(e) => updateFormData('lastName', e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('ecommerce.storefront.checkout.phone')}
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => updateFormData('phone', e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 pt-4">
                                    <MapPin size={20} style={{ color: primaryColor }} />
                                    {t('ecommerce.storefront.checkout.shippingAddress')}
                                </h2>

                                <div className="grid gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('ecommerce.storefront.checkout.address')} *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address1}
                                            onChange={(e) => updateFormData('address1', e.target.value)}
                                            required
                                            placeholder={t('ecommerce.storefront.checkout.addressPlaceholder')}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('ecommerce.storefront.checkout.addressOptional')}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address2}
                                            onChange={(e) => updateFormData('address2', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                        />
                                    </div>

                                    <div className="grid sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('ecommerce.storefront.checkout.city')} *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={(e) => updateFormData('city', e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('ecommerce.storefront.checkout.state')} *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.state}
                                                onChange={(e) => updateFormData('state', e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('ecommerce.storefront.checkout.zipCode')} *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.zipCode}
                                                onChange={(e) => updateFormData('zipCode', e.target.value)}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {t('ecommerce.storefront.checkout.country')} *
                                        </label>
                                        <select
                                            value={formData.country}
                                            onChange={(e) => updateFormData('country', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                        >
                                            <option value="México">{t('ecommerce.storefront.checkout.countries.mexico')}</option>
                                            <option value="Estados Unidos">{t('ecommerce.storefront.checkout.countries.usa')}</option>
                                            <option value="Canadá">{t('ecommerce.storefront.checkout.countries.canada')}</option>
                                            <option value="España">{t('ecommerce.storefront.checkout.countries.spain')}</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleNextStep}
                                    disabled={!validateStep('information')}
                                    className="w-full py-3 rounded-lg text-white font-bold disabled:opacity-50 transition-colors"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {requiresShipping ? t('ecommerce.storefront.checkout.continueToShipping') : t('ecommerce.storefront.checkout.continueToPayment')}
                                </button>
                            </div>
                        )}

                        {/* Shipping Step */}
                        {currentStep === 'shipping' && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Truck size={20} style={{ color: primaryColor }} />
                                    {t('ecommerce.storefront.checkout.shippingMethod')}
                                </h2>

                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                                        style={{ borderColor: primaryColor }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="radio"
                                                name="shipping"
                                                checked
                                                readOnly
                                                className="w-4 h-4"
                                                style={{ accentColor: primaryColor }}
                                            />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {t('ecommerce.storefront.checkout.standardShipping')}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {t('ecommerce.storefront.checkout.businessDays')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {shippingCost === 0 ? t('ecommerce.storefront.cart.free') : `${currencySymbol}${shippingCost.toFixed(2)}`}
                                        </span>
                                    </label>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setCurrentStep('information')}
                                        className="flex-1 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        {t('ecommerce.storefront.checkout.back')}
                                    </button>
                                    <button
                                        onClick={handleNextStep}
                                        className="flex-1 py-3 rounded-lg text-white font-bold transition-colors"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {t('ecommerce.storefront.checkout.continueToPayment')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Payment Step */}
                        {currentStep === 'payment' && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <CreditCard size={20} style={{ color: primaryColor }} />
                                    {t('ecommerce.storefront.checkout.paymentMethod')}
                                </h2>

                                <div className="space-y-3">
                                    <label
                                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                            formData.paymentMethod === 'stripe'
                                                ? ''
                                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                        style={formData.paymentMethod === 'stripe' ? { borderColor: primaryColor } : {}}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="stripe"
                                            checked={formData.paymentMethod === 'stripe'}
                                            onChange={(e) => updateFormData('paymentMethod', e.target.value)}
                                            className="w-4 h-4"
                                            style={{ accentColor: primaryColor }}
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {t('ecommerce.storefront.checkout.creditDebit')}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('ecommerce.storefront.checkout.creditDebitBrands')}
                                            </p>
                                        </div>
                                        <CreditCard className="text-gray-400" size={24} />
                                    </label>

                                    <label
                                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                            formData.paymentMethod === 'paypal'
                                                ? ''
                                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                        style={formData.paymentMethod === 'paypal' ? { borderColor: primaryColor } : {}}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="paypal"
                                            checked={formData.paymentMethod === 'paypal'}
                                            onChange={(e) => updateFormData('paymentMethod', e.target.value)}
                                            className="w-4 h-4"
                                            style={{ accentColor: primaryColor }}
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {t('ecommerce.storefront.checkout.paypal')}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('ecommerce.storefront.checkout.paypalDesc')}
                                            </p>
                                        </div>
                                    </label>

                                    <label
                                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                            formData.paymentMethod === 'cod'
                                                ? ''
                                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                        style={formData.paymentMethod === 'cod' ? { borderColor: primaryColor } : {}}
                                    >
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="cod"
                                            checked={formData.paymentMethod === 'cod'}
                                            onChange={(e) => updateFormData('paymentMethod', e.target.value)}
                                            className="w-4 h-4"
                                            style={{ accentColor: primaryColor }}
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {t('ecommerce.storefront.checkout.cashOnDelivery')}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('ecommerce.storefront.checkout.cashOnDeliveryDesc')}
                                            </p>
                                        </div>
                                        <Truck className="text-gray-400" size={24} />
                                    </label>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('ecommerce.storefront.checkout.orderNotes')}
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => updateFormData('notes', e.target.value)}
                                        rows={3}
                                        placeholder={t('ecommerce.storefront.checkout.orderNotesPlaceholder')}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setCurrentStep(requiresShipping ? 'shipping' : 'information')}
                                        className="flex-1 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        {t('ecommerce.storefront.checkout.back')}
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !validateStep('payment')}
                                        className="flex-1 py-3 rounded-lg text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                {t('ecommerce.storefront.checkout.processing')}
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={18} />
                                                {t('ecommerce.storefront.checkout.pay')} {currencySymbol}{total.toFixed(2)}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm sticky top-32">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <ShoppingBag size={20} style={{ color: primaryColor }} />
                                {t('ecommerce.storefront.checkout.orderSummary')} ({itemCount} {itemCount === 1 ? t('ecommerce.storefront.cart.product') : t('ecommerce.storefront.cart.products')})
                            </h3>

                            {/* Items */}
                            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                                {items.map((item) => (
                                    <div
                                        key={`${item.productId}-${item.variantId || 'default'}`}
                                        className="flex gap-3"
                                    >
                                        <div className="relative">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.productName}
                                                    className="w-14 h-14 object-cover rounded-lg"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                    <ShoppingBag className="text-gray-400" size={20} />
                                                </div>
                                            )}
                                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-gray-500 text-white text-xs rounded-full flex items-center justify-center">
                                                {item.quantity}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {item.productName}
                                            </p>
                                            {item.variantName && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {item.variantName}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>{t('ecommerce.storefront.cart.subtotal')}</span>
                                    <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>{t('ecommerce.storefront.cart.discount')} ({discountCode})</span>
                                        <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>{t('ecommerce.storefront.cart.shipping')}</span>
                                    <span>{shippingCost === 0 ? t('ecommerce.storefront.cart.free') : `${currencySymbol}${shippingCost.toFixed(2)}`}</span>
                                </div>
                                {taxAmount > 0 && (
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                        <span>{t('ecommerce.storefront.checkout.taxes')}</span>
                                        <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <span>{t('ecommerce.storefront.cart.total')}</span>
                                    <span>{currencySymbol}{total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;














