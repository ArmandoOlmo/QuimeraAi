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
        expect(accessibleIds).toContain('design-system');
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

    it('declares Bio Page Engine ecosystem ownership and AI generation dependencies', () => {
        const blueprint = getModuleRegistryItem('ai-business-blueprint');
        const websiteBuilder = getModuleRegistryItem('website-builder');
        const designSystem = getModuleRegistryItem('design-system');
        const bioPage = getModuleRegistryItem('bio-page-engine');

        expect(blueprint).toMatchObject({
            canonicalSystem: 'businessBlueprint',
            ownerSystem: 'ai-studio',
        });
        expect(blueprint?.writesTo).toEqual(expect.arrayContaining(['websiteBuilder', 'designSystem', 'bioPage']));

        expect(websiteBuilder).toMatchObject({
            canonicalSystem: 'websiteBuilder',
            ownerSystem: 'website-builder',
        });
        expect(websiteBuilder?.readsFrom).toEqual(expect.arrayContaining(['businessBlueprint', 'designSystem', 'bioPage']));

        expect(designSystem).toMatchObject({
            canonicalSystem: 'designSystem',
            ownerSystem: 'design-system',
        });
        expect(designSystem?.writesTo).toEqual(expect.arrayContaining(['websiteBuilder', 'bioPage']));

        expect(bioPage).toMatchObject({
            canonicalSystem: 'bioPage',
            ownerSystem: 'bio-page-engine',
        });
        expect(bioPage?.editableBy).toEqual(expect.arrayContaining(['bio-page-engine', 'ai-studio', 'website-builder']));
        expect(bioPage?.readsFrom).toEqual(expect.arrayContaining([
            'businessBlueprint',
            'websiteBuilder',
            'designSystem',
            'ecommerce',
            'appointments',
            'crm',
            'emailMarketing',
            'chatbot',
            'media',
            'analytics',
        ]));
        expect(getModulesByCanonicalSystem('bioPage').map(item => item.id)).toEqual(expect.arrayContaining([
            'ai-business-blueprint',
            'website-builder',
            'design-system',
            'bio-page-engine',
        ]));
    });

    it('defines Chatbot Engine as the canonical AI Business Agent integration surface', () => {
        const chatbot = getModuleRegistryItem('chatbot-engine');

        expect(chatbot).toMatchObject({
            canonicalSystem: 'chatbot',
            ownerSystem: 'chatbot-engine',
            requiredService: 'chatbot',
            requiredFeature: 'chatbotEnabled',
        });
        expect(chatbot?.description).toContain('ES:');
        expect(chatbot?.description).toContain('EN:');
        expect(chatbot?.readsFrom).toEqual(expect.arrayContaining([
            'ecommerce',
            'crm',
            'appointments',
            'restaurants',
            'realEstate',
            'emailMarketing',
            'bioPage',
            'analytics',
        ]));
        expect(chatbot?.writesTo).toEqual(expect.arrayContaining([
            'crm',
            'appointments',
            'emailMarketing',
            'analytics',
        ]));
    });
});
