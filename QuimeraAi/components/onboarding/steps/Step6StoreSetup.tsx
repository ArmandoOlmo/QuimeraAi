/**
 * Step6StoreSetup
 * Store setup step: Configure basic ecommerce settings
 * Only shown if hasEcommerce = true
 */

import React, { useState, useEffect } from 'react';
import { Store, DollarSign, Truck, Sparkles, Plus, X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OnboardingStoreSetup, ShippingType } from '../../../types/onboarding';

// Currency options
const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
    { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
    { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
    { code: 'COP', symbol: '$', name: 'Colombian Peso' },
    { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

// Shipping type options
const SHIPPING_TYPES: { id: ShippingType; labelKey: string; icon: string }[] = [
    { id: 'local', labelKey: 'onboarding.shippingLocal', icon: '📍' },
    { id: 'national', labelKey: 'onboarding.shippingNational', icon: '🚚' },
    { id: 'international', labelKey: 'onboarding.shippingInternational', icon: '✈️' },
    { id: 'digital_only', labelKey: 'onboarding.shippingDigital', icon: '💻' },
];

interface Step6StoreSetupProps {
    storeSetup: OnboardingStoreSetup | undefined;
    businessName: string;
    industry: string;
    ecommerceType?: 'physical' | 'digital' | 'both';
    suggestedCategories: string[];
    isLoadingCategories: boolean;
    onUpdate: (storeSetup: OnboardingStoreSetup) => void;
    onGenerateCategories: () => Promise<void>;
}

const Step6StoreSetup: React.FC<Step6StoreSetupProps> = ({
    storeSetup,
    businessName,
    industry,
    ecommerceType,
    suggestedCategories,
    isLoadingCategories,
    onUpdate,
    onGenerateCategories,
}) => {
    const { t } = useTranslation();
    const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    // Initialize store setup with defaults
    useEffect(() => {
        if (!storeSetup) {
            onUpdate({
                storeName: businessName,
                currency: 'USD',
                currencySymbol: '$',
                shippingType: ecommerceType === 'digital' ? 'digital_only' : 'national',
                suggestedCategories: suggestedCategories,
                selectedCategories: [],
            });
        }
    }, []);

    // Update suggested categories when they change
    useEffect(() => {
        if (storeSetup && suggestedCategories.length > 0 && storeSetup.suggestedCategories.length === 0) {
            onUpdate({
                ...storeSetup,
                suggestedCategories: suggestedCategories,
            });
        }
    }, [suggestedCategories]);

    // Generate categories on mount if empty
    useEffect(() => {
        if (suggestedCategories.length === 0 && !isLoadingCategories) {
            onGenerateCategories();
        }
    }, []);

    const handleStoreName = (name: string) => {
        if (storeSetup) {
            onUpdate({ ...storeSetup, storeName: name });
        }
    };

    const handleCurrencyChange = (currencyCode: string) => {
        const currency = CURRENCIES.find(c => c.code === currencyCode);
        if (storeSetup && currency) {
            onUpdate({
                ...storeSetup,
                currency: currency.code,
                currencySymbol: currency.symbol,
            });
        }
        setIsCurrencyOpen(false);
    };

    const handleShippingChange = (shippingType: ShippingType) => {
        if (storeSetup) {
            onUpdate({ ...storeSetup, shippingType });
        }
    };

    const handleCategoryToggle = (category: string) => {
        if (storeSetup) {
            const isSelected = storeSetup.selectedCategories.includes(category);
            const newSelected = isSelected
                ? storeSetup.selectedCategories.filter(c => c !== category)
                : [...storeSetup.selectedCategories, category];
            onUpdate({ ...storeSetup, selectedCategories: newSelected });
        }
    };

    const handleAddCustomCategory = () => {
        if (newCategory.trim() && storeSetup) {
            const category = newCategory.trim();
            if (!storeSetup.suggestedCategories.includes(category)) {
                onUpdate({
                    ...storeSetup,
                    suggestedCategories: [...storeSetup.suggestedCategories, category],
                    selectedCategories: [...storeSetup.selectedCategories, category],
                });
            }
            setNewCategory('');
        }
    };

    const selectedCurrency = CURRENCIES.find(c => c.code === storeSetup?.currency) || CURRENCIES[0];

    return (
        <div className="max-w-xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary flex items-center justify-center">
                    <Store size={32} className="text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                    {t('onboarding.step6Heading', 'Store Setup')}
                </h3>
                <p className="text-muted-foreground">
                    {t('onboarding.step6Subheading', 'Configure basic details for your online store')}
                </p>
            </div>

            {/* Store Name */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                    {t('onboarding.storeName', 'Store Name')}
                </label>
                <input
                    type="text"
                    value={storeSetup?.storeName || businessName}
                    onChange={(e) => handleStoreName(e.target.value)}
                    placeholder={t('onboarding.storeNamePlaceholder', 'Your Store Name')}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
            </div>

            {/* Currency Selector */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                    {t('onboarding.currency', 'Currency')}
                </label>
                <div className="relative">
                    <button
                        onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                        className={`
                            w-full px-4 py-3 bg-card border rounded-xl text-left
                            flex items-center justify-between transition-all
                            ${isCurrencyOpen
                                ? 'border-primary ring-2 ring-primary/50'
                                : 'border-border hover:border-muted-foreground'
                            }
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <DollarSign size={18} className="text-muted-foreground" />
                            <span className="text-foreground">
                                {selectedCurrency.symbol} {selectedCurrency.code} - {selectedCurrency.name}
                            </span>
                        </div>
                        <ChevronDown
                            size={18}
                            className={`text-muted-foreground transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {isCurrencyOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsCurrencyOpen(false)}
                            />
                            <div className="absolute z-50 w-full mt-2 rounded-xl shadow-2xl overflow-hidden border border-border bg-popover max-h-64 overflow-y-auto">
                                {CURRENCIES.map((currency) => (
                                    <button
                                        key={currency.code}
                                        onClick={() => handleCurrencyChange(currency.code)}
                                        className={`
                                            w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between
                                            ${storeSetup?.currency === currency.code
                                                ? 'bg-primary/20 text-primary'
                                                : 'text-popover-foreground hover:bg-accent'
                                            }
                                        `}
                                    >
                                        <span>{currency.symbol} {currency.code} - {currency.name}</span>
                                        {storeSetup?.currency === currency.code && (
                                            <Check size={16} className="text-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Shipping Type */}
            {ecommerceType !== 'digital' && (
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">
                        {t('onboarding.shippingType', 'Shipping Type')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {SHIPPING_TYPES.filter(s => s.id !== 'digital_only').map((shipping) => (
                            <button
                                key={shipping.id}
                                type="button"
                                onClick={() => handleShippingChange(shipping.id)}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${storeSetup?.shippingType === shipping.id
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-muted-foreground'
                                    }`}
                            >
                                <span className="text-xl">{shipping.icon}</span>
                                <span className={`text-sm font-medium ${storeSetup?.shippingType === shipping.id ? 'text-primary' : 'text-foreground'
                                    }`}>
                                    {t(shipping.labelKey, shipping.id)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Categories Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-foreground">
                        {t('onboarding.productCategories', 'Product Categories')}
                    </label>
                    <button
                        onClick={onGenerateCategories}
                        disabled={isLoadingCategories}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                        {isLoadingCategories ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Sparkles size={14} />
                        )}
                        {t('onboarding.regenerateCategories', 'Regenerate')}
                    </button>
                </div>

                {/* Loading state */}
                {isLoadingCategories && (
                    <div className="flex items-center justify-center py-8 bg-muted/30 rounded-xl border border-border">
                        <div className="flex items-center gap-3">
                            <Loader2 size={20} className="animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">
                                {t('onboarding.generatingCategories', 'Generating categories with AI...')}
                            </span>
                        </div>
                    </div>
                )}

                {/* Categories grid */}
                {!isLoadingCategories && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            {(storeSetup?.suggestedCategories || []).map((category) => {
                                const isSelected = storeSetup?.selectedCategories.includes(category);
                                return (
                                    <button
                                        key={category}
                                        onClick={() => handleCategoryToggle(category)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        {isSelected && <Check size={14} />}
                                        {category}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Add custom category */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                                placeholder={t('onboarding.addCategoryPlaceholder', 'Add custom category...')}
                                className="flex-1 px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                            <button
                                onClick={handleAddCustomCategory}
                                disabled={!newCategory.trim()}
                                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Selected count */}
                {storeSetup && storeSetup.selectedCategories.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        {t('onboarding.selectedCategories', '{{count}} categories selected', {
                            count: storeSetup.selectedCategories.length,
                        })}
                    </p>
                )}
            </div>

            {/* Tip */}
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
                <p className="text-sm text-foreground">
                    <span className="font-semibold">💡 {t('onboarding.tip', 'Tip')}:</span>{' '}
                    {t('onboarding.step6Tip', 'Select at least one category. You can add more products and categories later in the ecommerce dashboard.')}
                </p>
            </div>
        </div>
    );
};

export default Step6StoreSetup;
