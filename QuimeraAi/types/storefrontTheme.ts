import type { StorefrontThemeSettings } from './ecommerce';
import type { ProductCardVariant } from './productCard';
import type { GlobalColors } from './ui';

export type { ProductCardVariant } from './productCard';

export type StorefrontThemePresetId =
    | 'minimal'
    | 'luxury'
    | 'fitness'
    | 'marketplace'
    | 'editorial'
    | 'beauty'
    | 'food'
    | 'fashion'
    | 'digital'
    | 'restaurant'
    | 'realEstate'
    | 'services';

export type StorefrontCatalogSize =
    | 'empty'
    | 'single'
    | 'small'
    | 'medium'
    | 'large'
    | 'enterprise';

export interface StorefrontCatalogSizeRule {
    size: StorefrontCatalogSize;
    minProducts: number;
    maxProducts?: number;
    recommendedCollectionLayout: 'empty' | 'single-product' | 'grid' | 'filtered-grid' | 'search-first';
    recommendedProductCardVariant: ProductCardVariant;
    warnings: string[];
}

export interface StorefrontTemplateCompatibility {
    compatibleIndustries: string[];
    catalogSizes: StorefrontCatalogSize[];
    requiredModules: string[];
    optionalModules: string[];
    unsupportedModules: string[];
}

export interface StorefrontThemePresetDefinition {
    id: StorefrontThemePresetId;
    label: string;
    description: string;
    compatibility: StorefrontTemplateCompatibility;
    theme: Partial<StorefrontThemeSettings>;
    productCardVariant: ProductCardVariant;
    recommendedSections: string[];
}

export interface StorefrontThemeSelectionInput {
    industry?: string;
    catalogSize?: StorefrontCatalogSize;
    productCount?: number;
    enabledModules?: string[];
    preferredPresetId?: StorefrontThemePresetId;
}

export interface StorefrontThemeResolutionInput extends StorefrontThemeSelectionInput {
    storefrontTheme?: Partial<StorefrontThemeSettings>;
    projectGlobalColors?: Partial<GlobalColors> | Record<string, string>;
    brandColors?: Partial<GlobalColors> | Record<string, string>;
}

export interface StorefrontThemeResolution {
    preset: StorefrontThemePresetDefinition;
    catalogSize: StorefrontCatalogSize;
    fallbackChain: string[];
    theme: StorefrontThemeSettings;
}
