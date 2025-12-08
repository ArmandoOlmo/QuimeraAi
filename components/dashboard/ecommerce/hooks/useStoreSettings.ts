/**
 * useStoreSettings Hook
 * Hook para gestión de configuración de tienda en Firestore
 */

import { useState, useEffect, useCallback } from 'react';
import {
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { StoreSettings, ShippingZone, ShippingRate } from '../../../../types/ecommerce';

const DEFAULT_SETTINGS: Omit<StoreSettings, 'createdAt' | 'updatedAt'> = {
    storeName: '',
    storeEmail: '',
    currency: 'USD',
    currencySymbol: '$',
    // Taxes
    taxEnabled: false,
    taxRate: 0,
    taxName: 'IVA',
    taxIncluded: false,
    taxIncludedInPrice: false,
    // Shipping
    shippingZones: [],
    freeShippingThreshold: 0,
    // Payments
    stripeEnabled: false,
    stripePublishableKey: '',
    paypalEnabled: false,
    paypalClientId: '',
    cashOnDeliveryEnabled: true,
    // Stripe Connect defaults are handled separately (not in defaults)
    // Notifications - Admin
    orderNotificationEmail: '',
    lowStockNotifications: true,
    lowStockThreshold: 5,
    notifyOnNewOrder: true,
    notifyOnLowStock: true,
    // Notifications - Customer
    sendOrderConfirmation: true,
    sendShippingNotification: true,
    // Checkout
    requirePhone: false,
    requireShippingAddress: true,
};

export const useStoreSettings = (userId: string, storeId?: string) => {
    const [settings, setSettings] = useState<StoreSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const effectiveStoreId = storeId || '';
    const settingsPath = `users/${userId}/stores/${effectiveStoreId}/settings/store`;

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        const settingsRef = doc(db, settingsPath);

        const unsubscribe = onSnapshot(
            settingsRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setSettings(snapshot.data() as StoreSettings);
                } else {
                    // Create default settings if they don't exist
                    setSettings(null);
                }
                setIsLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching store settings:', err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, effectiveStoreId, settingsPath]);

    // Initialize settings with defaults
    const initializeSettings = useCallback(
        async (initialData?: Partial<StoreSettings>) => {
            setIsSaving(true);
            try {
                const settingsRef = doc(db, settingsPath);
                await setDoc(settingsRef, {
                    ...DEFAULT_SETTINGS,
                    ...initialData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            } catch (err: any) {
                setError(err.message);
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [settingsPath]
    );

    // Update settings
    const updateSettings = useCallback(
        async (updates: Partial<StoreSettings>) => {
            setIsSaving(true);
            try {
                const settingsRef = doc(db, settingsPath);
                
                if (!settings) {
                    // Create with defaults if doesn't exist
                    await setDoc(settingsRef, {
                        ...DEFAULT_SETTINGS,
                        ...updates,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                } else {
                    await updateDoc(settingsRef, {
                        ...updates,
                        updatedAt: serverTimestamp(),
                    });
                }
            } catch (err: any) {
                setError(err.message);
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [settingsPath, settings]
    );

    // Update store info
    const updateStoreInfo = useCallback(
        async (info: {
            storeName?: string;
            storeEmail?: string;
            storePhone?: string;
            storeLogo?: string;
        }) => {
            await updateSettings(info);
        },
        [updateSettings]
    );

    // Update currency settings
    const updateCurrencySettings = useCallback(
        async (currency: string, currencySymbol: string) => {
            await updateSettings({ currency, currencySymbol });
        },
        [updateSettings]
    );

    // Update tax settings
    const updateTaxSettings = useCallback(
        async (taxRate: number, taxIncluded: boolean) => {
            await updateSettings({ taxRate, taxIncluded });
        },
        [updateSettings]
    );

    // Add shipping zone
    const addShippingZone = useCallback(
        async (zone: Omit<ShippingZone, 'id'>) => {
            const currentZones = settings?.shippingZones || [];
            const newZone: ShippingZone = {
                ...zone,
                id: `zone-${Date.now()}`,
            };
            
            await updateSettings({
                shippingZones: [...currentZones, newZone],
            });

            return newZone.id;
        },
        [settings, updateSettings]
    );

    // Update shipping zone
    const updateShippingZone = useCallback(
        async (zoneId: string, updates: Partial<ShippingZone>) => {
            const currentZones = settings?.shippingZones || [];
            const updatedZones = currentZones.map((zone) =>
                zone.id === zoneId ? { ...zone, ...updates } : zone
            );

            await updateSettings({ shippingZones: updatedZones });
        },
        [settings, updateSettings]
    );

    // Delete shipping zone
    const deleteShippingZone = useCallback(
        async (zoneId: string) => {
            const currentZones = settings?.shippingZones || [];
            const updatedZones = currentZones.filter((zone) => zone.id !== zoneId);

            await updateSettings({ shippingZones: updatedZones });
        },
        [settings, updateSettings]
    );

    // Add shipping rate to zone
    const addShippingRate = useCallback(
        async (zoneId: string, rate: Omit<ShippingRate, 'id'>) => {
            const currentZones = settings?.shippingZones || [];
            const newRate: ShippingRate = {
                ...rate,
                id: `rate-${Date.now()}`,
            };

            const updatedZones = currentZones.map((zone) =>
                zone.id === zoneId
                    ? { ...zone, rates: [...zone.rates, newRate] }
                    : zone
            );

            await updateSettings({ shippingZones: updatedZones });
            return newRate.id;
        },
        [settings, updateSettings]
    );

    // Delete shipping rate from zone
    const deleteShippingRate = useCallback(
        async (zoneId: string, rateId: string) => {
            const currentZones = settings?.shippingZones || [];
            const updatedZones = currentZones.map((zone) =>
                zone.id === zoneId
                    ? { ...zone, rates: zone.rates.filter((r) => r.id !== rateId) }
                    : zone
            );

            await updateSettings({ shippingZones: updatedZones });
        },
        [settings, updateSettings]
    );

    // Update payment settings
    const updatePaymentSettings = useCallback(
        async (paymentSettings: {
            stripeEnabled?: boolean;
            stripePublishableKey?: string;
            paypalEnabled?: boolean;
            cashOnDeliveryEnabled?: boolean;
        }) => {
            await updateSettings(paymentSettings);
        },
        [updateSettings]
    );

    // Update notification settings
    const updateNotificationSettings = useCallback(
        async (notificationSettings: {
            orderNotificationEmail?: string;
            lowStockNotifications?: boolean;
            lowStockThreshold?: number;
        }) => {
            await updateSettings(notificationSettings);
        },
        [updateSettings]
    );

    // Update checkout settings
    const updateCheckoutSettings = useCallback(
        async (checkoutSettings: {
            requirePhone?: boolean;
            requireShippingAddress?: boolean;
            termsAndConditionsUrl?: string;
            privacyPolicyUrl?: string;
        }) => {
            await updateSettings(checkoutSettings);
        },
        [updateSettings]
    );

    // Get shipping rate for address
    const getShippingRateForAddress = useCallback(
        (country: string, orderTotal: number): ShippingRate[] => {
            if (!settings?.shippingZones) return [];

            const zone = settings.shippingZones.find((z) =>
                z.countries.includes(country) || z.countries.includes('*')
            );

            if (!zone) return [];

            return zone.rates.filter(
                (rate) => !rate.minOrderAmount || orderTotal >= rate.minOrderAmount
            );
        },
        [settings]
    );

    // Calculate tax
    const calculateTax = useCallback(
        (subtotal: number): number => {
            if (!settings) return 0;
            return (subtotal * settings.taxRate) / 100;
        },
        [settings]
    );

    // Format price
    const formatPrice = useCallback(
        (amount: number): string => {
            const symbol = settings?.currencySymbol || '$';
            return `${symbol}${amount.toFixed(2)}`;
        },
        [settings]
    );

    return {
        settings,
        isLoading,
        error,
        isSaving,
        initializeSettings,
        updateSettings,
        updateStoreInfo,
        updateCurrencySettings,
        updateTaxSettings,
        addShippingZone,
        updateShippingZone,
        deleteShippingZone,
        addShippingRate,
        deleteShippingRate,
        updatePaymentSettings,
        updateNotificationSettings,
        updateCheckoutSettings,
        getShippingRateForAddress,
        calculateTax,
        formatPrice,
    };
};

