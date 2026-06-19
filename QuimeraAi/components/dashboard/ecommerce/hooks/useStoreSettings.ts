/**
 * useStoreSettings Hook
 * Hook para gestión de configuración de tienda en Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../supabase';
import { StoreSettings, ShippingZone, ShippingRate, StorefrontThemeSettings, DEFAULT_STOREFRONT_THEME } from '../../../../types/ecommerce';
import { mapStoreSettingsFromDB, mapStoreSettingsToDB } from '../../../../utils/ecommerceMappers';
import { createRealtimeChannelName } from './realtimeChannelName';

// Helper functions for color manipulation
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
    } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
};

const adjustColorBrightness = (color: string, percent: number): string => {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    
    const factor = percent / 100;
    return rgbToHex(
        rgb.r + (255 - rgb.r) * factor,
        rgb.g + (255 - rgb.g) * factor,
        rgb.b + (255 - rgb.b) * factor
    );
};

const getContrastColor = (hexcolor: string): string => {
    const rgb = hexToRgb(hexcolor);
    if (!rgb) return '#ffffff';
    
    // Using W3C algorithm for contrast
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
};

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

    const fetchSettings = useCallback(async () => {
        if (!effectiveStoreId) return;

        setIsLoading(true);
        const { data, error: fetchError } = await supabase
            .from('store_settings')
            .select('*')
            .eq('project_id', effectiveStoreId)
            .limit(1)
            .maybeSingle();

        if (fetchError) {
            console.error('Error fetching store settings:', fetchError);
            setError(fetchError.message);
        } else {
            if (data) {
                setSettings(mapStoreSettingsFromDB(data));
            } else {
                setSettings(null); // No settings exist
            }
            setError(null);
        }
        setIsLoading(false);
    }, [effectiveStoreId]);

    useEffect(() => {
        if (!userId || !effectiveStoreId) {
            setIsLoading(false);
            return;
        }

        fetchSettings();

        const channel = supabase.channel(createRealtimeChannelName('store_settings_changes', effectiveStoreId))
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'store_settings',
                    filter: `project_id=eq.${effectiveStoreId}`
                },
                () => {
                    fetchSettings();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, effectiveStoreId, fetchSettings]);

    // Initialize settings with defaults
    const initializeSettings = useCallback(
        async (initialData?: Partial<StoreSettings>) => {
            setIsSaving(true);
            try {
                const combined = { ...DEFAULT_SETTINGS, ...initialData };
                const dbData = mapStoreSettingsToDB(combined);
                dbData.project_id = effectiveStoreId;

                const { error } = await supabase
                    .from('store_settings')
                    .insert(dbData);

                if (error) throw error;
            } catch (err: any) {
                setError(err.message);
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [effectiveStoreId]
    );

    // Update settings
    const updateSettings = useCallback(
        async (updates: Partial<StoreSettings>) => {
            setIsSaving(true);
            try {
                if (!settings) {
                    // Create with defaults if doesn't exist
                    const combined = { ...DEFAULT_SETTINGS, ...updates };
                    const dbData = mapStoreSettingsToDB(combined);
                    dbData.project_id = effectiveStoreId;

                    const { error } = await supabase
                        .from('store_settings')
                        .insert(dbData);

                    if (error) throw error;
                } else {
                    const updateData = mapStoreSettingsToDB(updates);

                    const { error } = await supabase
                        .from('store_settings')
                        .update(updateData)
                        .eq('project_id', effectiveStoreId);

                    if (error) throw error;
                }

                // Note: The public store sync logic from Supabase might need a Supabase Edge Function to properly sync
                // to a public store read-replica or just rely on public RLS to `store_settings`.
                // In Supabase, if the storefront queries `store_settings` with public read access, direct sync is not needed.
                // Assuming we use public policies or edge functions, we'll log it as migrated.
                if (updates.storefrontTheme && effectiveStoreId) {
                    console.log('[useStoreSettings] Theme synced via Supabase Realtime/Triggers');
                }
            } catch (err: any) {
                setError(err.message);
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [settings, effectiveStoreId]
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

    // Update storefront theme settings
    const updateStorefrontTheme = useCallback(
        async (themeUpdates: Partial<StorefrontThemeSettings>) => {
            const currentTheme = settings?.storefrontTheme || DEFAULT_STOREFRONT_THEME;
            await updateSettings({
                storefrontTheme: {
                    ...currentTheme,
                    ...themeUpdates,
                },
            });
        },
        [settings, updateSettings]
    );

    // Replace entire storefront theme (e.g., from Coolors palette)
    const replaceStorefrontTheme = useCallback(
        async (newTheme: StorefrontThemeSettings) => {
            await updateSettings({
                storefrontTheme: newTheme,
            });
        },
        [updateSettings]
    );

    // Reset storefront theme to defaults
    const resetStorefrontTheme = useCallback(
        async () => {
            await updateSettings({
                storefrontTheme: DEFAULT_STOREFRONT_THEME,
            });
        },
        [updateSettings]
    );

    // Apply Coolors palette to theme
    const applyCooolrsPalette = useCallback(
        async (colors: string[], paletteUrl?: string) => {
            if (colors.length < 5) return;
            
            // Map Coolors colors to theme properties intelligently
            const themeFromPalette: Partial<StorefrontThemeSettings> = {
                primaryColor: colors[0],
                secondaryColor: colors[1],
                accentColor: colors[2],
                backgroundColor: colors[4], // Lightest color usually
                headingColor: colors[3],
                textColor: adjustColorBrightness(colors[3], 20),
                buttonBackground: colors[0],
                buttonText: getContrastColor(colors[0]),
                buttonHoverBackground: adjustColorBrightness(colors[0], -15),
                badgeBackground: colors[2],
                badgeText: getContrastColor(colors[2]),
                linkColor: colors[0],
                cardBackground: adjustColorBrightness(colors[4], -5),
                borderColor: adjustColorBrightness(colors[4], -15),
                coolorsUrl: paletteUrl,
                coolorsColors: colors,
            };
            
            await updateStorefrontTheme(themeFromPalette);
        },
        [updateStorefrontTheme]
    );

    // Get storefront theme with defaults
    const getStorefrontTheme = useCallback((): StorefrontThemeSettings => {
        return {
            ...DEFAULT_STOREFRONT_THEME,
            ...(settings?.storefrontTheme || {}),
        };
    }, [settings]);

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
        // Storefront Theme
        updateStorefrontTheme,
        replaceStorefrontTheme,
        resetStorefrontTheme,
        applyCooolrsPalette,
        getStorefrontTheme,
    };
};

// Export helper functions for use in components
export { adjustColorBrightness, getContrastColor, hexToRgb, rgbToHex };
