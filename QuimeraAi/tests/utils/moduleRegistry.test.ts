import { describe, expect, it } from 'vitest';
import {
    canAccessModuleRegistryItem,
    getAccessibleModuleRegistry,
    getModuleRegistryItem,
    getModulesByCanonicalSystem,
    quimeraModuleRegistry,
} from '../../registry/moduleRegistry';

describe('moduleRegistry', () => {
    it('defines canonical ecommerce ownership separately from storefront presentation', () => {
        const ecommerce = getModuleRegistryItem('ecommerce-engine');
        const storefront = getModuleRegistryItem('storefront-builder');

        expect(ecommerce).toMatchObject({
            canonicalSystem: 'ecommerce',
            ownerSystem: 'ecommerce-engine',
        });
        expect(ecommerce?.editableBy).toContain('ecommerce-admin');
        expect(ecommerce?.description).toContain('products');

        expect(storefront).toMatchObject({
            ownerSystem: 'storefront-builder',
            requiredService: 'ecommerce',
            requiredFeature: 'ecommerceEnabled',
        });
        expect(storefront?.editableBy).toContain('storefront-builder');
        expect(storefront?.readsFrom).toContain('ecommerce');
        expect(storefront?.writesTo).toBeUndefined();
    });

    it('gates ecommerce modules by service availability and plan feature', () => {
        const storefront = getModuleRegistryItem('storefront-builder');
        expect(storefront).toBeDefined();

        expect(canAccessModuleRegistryItem(storefront!)).toBe(false);
        expect(canAccessModuleRegistryItem(storefront!, {
            canAccessService: service => service === 'ecommerce',
            hasPlanFeature: feature => feature === 'ecommerceEnabled',
        })).toBe(true);
        expect(canAccessModuleRegistryItem(storefront!, {
            canAccessService: () => true,
            hasPlanFeature: () => false,
        })).toBe(false);
    });

    it('keeps ungated core modules visible while filtering gated modules without access', () => {
        const accessible = getAccessibleModuleRegistry();
        const accessibleIds = accessible.map(item => item.id);

        expect(accessibleIds).toContain('ai-business-blueprint');
        expect(accessibleIds).toContain('website-builder');
        expect(accessibleIds).not.toContain('ecommerce-engine');
        expect(accessible.length).toBeLessThan(quimeraModuleRegistry.length);
    });

    it('indexes modules by canonical system and sync dependencies', () => {
        const ecommerceRelated = getModulesByCanonicalSystem('ecommerce').map(item => item.id);

        expect(ecommerceRelated).toContain('ecommerce-engine');
        expect(ecommerceRelated).toContain('website-featured-products-block');
        expect(ecommerceRelated).toContain('storefront-builder');
        expect(ecommerceRelated).toContain('email-marketing');
        expect(ecommerceRelated).toContain('finance');
    });
});
