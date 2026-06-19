import { describe, expect, it } from 'vitest';
import { DEFAULT_STOREFRONT_THEME } from '../../types/ecommerce';
import {
    getCompatibleStorefrontThemePresets,
    getStorefrontCatalogSize,
    getStorefrontCatalogSizeRule,
    resolveStorefrontTheme,
    resolveStorefrontThemeSettings,
    selectStorefrontThemePreset,
    STOREFRONT_THEME_PRESETS,
} from '../../utils/storefrontTheme';

describe('storefrontTheme presets', () => {
    it('classifies catalog sizes with explicit thresholds', () => {
        expect(getStorefrontCatalogSize(0)).toBe('empty');
        expect(getStorefrontCatalogSize(1)).toBe('single');
        expect(getStorefrontCatalogSize(12)).toBe('small');
        expect(getStorefrontCatalogSize(13)).toBe('medium');
        expect(getStorefrontCatalogSize(101)).toBe('large');
        expect(getStorefrontCatalogSize(1001)).toBe('enterprise');

        expect(getStorefrontCatalogSizeRule('large')).toMatchObject({
            recommendedCollectionLayout: 'search-first',
            recommendedProductCardVariant: 'marketplace',
        });
    });

    it('selects industry presets when compatible with catalog size and modules', () => {
        const preset = selectStorefrontThemePreset({
            industry: 'fitness ecommerce',
            productCount: 8,
            enabledModules: ['ecommerce-engine', 'appointments-engine'],
        });

        expect(preset.id).toBe('fitness');
        expect(preset.productCardVariant).toBe('fitness');
        expect(preset.compatibility.optionalModules).toContain('appointments-engine');
    });

    it('falls back to marketplace for large ecommerce catalogs', () => {
        const preset = selectStorefrontThemePreset({
            industry: 'retail ecommerce',
            productCount: 250,
            enabledModules: ['ecommerce-engine'],
        });

        expect(preset.id).toBe('marketplace');
        expect(preset.compatibility.catalogSizes).toContain('large');
    });

    it('filters incompatible presets by required and unsupported modules', () => {
        const withoutRestaurantEngine = getCompatibleStorefrontThemePresets({
            industry: 'restaurant',
            catalogSize: 'small',
            enabledModules: ['ecommerce-engine'],
        }).map(preset => preset.id);

        expect(withoutRestaurantEngine).toContain('food');
        expect(withoutRestaurantEngine).not.toContain('restaurant');

        const digitalWithPhysicalOnly = getCompatibleStorefrontThemePresets({
            industry: 'digital course',
            catalogSize: 'small',
            enabledModules: ['ecommerce-engine', 'physical-shipping-only'],
        }).map(preset => preset.id);

        expect(digitalWithPhysicalOnly).not.toContain('digital');
    });

    it('resolves StorefrontThemeSettings through defaults, preset, global colors, and explicit overrides', () => {
        const resolved = resolveStorefrontTheme({
            industry: 'fitness',
            productCount: 4,
            enabledModules: ['ecommerce-engine'],
            brandColors: {
                primary: '#0f766e',
                accent: '#f59e0b',
            },
            projectGlobalColors: {
                primary: '#2563eb',
                background: '#f8fafc',
                text: '#111827',
            },
            storefrontTheme: {
                primaryColor: '#be123c',
                buttonText: '#ffffff',
            },
        });

        expect(resolved.preset.id).toBe('fitness');
        expect(resolved.catalogSize).toBe('small');
        expect(resolved.fallbackChain).toEqual([
            'DEFAULT_STOREFRONT_THEME',
            'preset:fitness',
            'brandColors',
            'projectGlobalColors',
            'storefrontTheme',
        ]);
        expect(resolved.theme.primaryColor).toBe('#be123c');
        expect(resolved.theme.backgroundColor).toBe('#f8fafc');
        expect(resolved.theme.accentColor).toBe('#f59e0b');
        expect(resolved.theme.buttonText).toBe('#ffffff');
        expect(resolved.theme.fontFamily).toBe(DEFAULT_STOREFRONT_THEME.fontFamily);
    });

    it('returns a complete settings object for every preset', () => {
        Object.keys(STOREFRONT_THEME_PRESETS).forEach(presetId => {
            const settings = resolveStorefrontThemeSettings({
                preferredPresetId: presetId as keyof typeof STOREFRONT_THEME_PRESETS,
                enabledModules: ['ecommerce-engine', 'restaurant-engine', 'real-estate-engine'],
                catalogSize: 'small',
            });

            expect(settings.primaryColor).toMatch(/^#/);
            expect(settings.buttonBackground).toBeTruthy();
            expect(settings.headingFontFamily).toBeTruthy();
        });
    });
});
