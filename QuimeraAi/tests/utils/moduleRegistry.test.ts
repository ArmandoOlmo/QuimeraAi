import { describe, expect, it } from 'vitest';
import {
    canAccessModuleRegistryItem,
    getAgencyEngineOperatingSystemManifest,
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
            canonicalSystem: 'storefrontBuilder',
            ownerSystem: 'storefront-builder',
            requiredService: 'ecommerce',
            requiredFeature: 'ecommerceEnabled',
        });
        expect(storefront?.editableBy).toContain('storefront-builder');
        expect(storefront?.readsFrom).toContain('ecommerce');
        expect(storefront?.writesTo).toBeUndefined();

        const storefrontRelated = getModulesByCanonicalSystem('storefrontBuilder').map(item => item.id);
        expect(storefrontRelated).toEqual(expect.arrayContaining([
            'storefront-builder',
            'storefront-home-sections',
            'agency-engine',
            'agency-client-360',
            'agency-client-provisioning',
            'agency-project-transfer',
            'agency-white-label',
            'agency-client-portal',
            'agency-command-center',
        ]));
    });

    it('gates ecommerce modules by service availability and plan feature', () => {
        const storefront = getModuleRegistryItem('storefront-builder');
        expect(storefront).toBeDefined();

        expect(canAccessModuleRegistryItem(storefront!)).toBe(false);
        expect(canAccessModuleRegistryItem(storefront!, {
            canAccessService: service => service === 'ecommerce',
            hasPlanFeature: feature => feature === 'ecommerceEnabled',
            permissions: { canManageEcommerce: true },
        })).toBe(true);
        expect(canAccessModuleRegistryItem(storefront!, {
            canAccessService: () => true,
            hasPlanFeature: () => false,
            permissions: { canManageEcommerce: true },
        })).toBe(false);
    });

    it('gates registry modules by required tenant permissions', () => {
        const storefront = getModuleRegistryItem('storefront-builder');
        const agencyBilling = getModuleRegistryItem('agency-billing');

        const serviceAndFeatureAccess = {
            canAccessService: () => true,
            hasPlanFeature: () => true,
        };

        expect(canAccessModuleRegistryItem(storefront!, serviceAndFeatureAccess)).toBe(false);
        expect(canAccessModuleRegistryItem(storefront!, {
            ...serviceAndFeatureAccess,
            permissions: { canManageEcommerce: true },
        })).toBe(true);

        expect(canAccessModuleRegistryItem(agencyBilling!, {
            ...serviceAndFeatureAccess,
            permissions: { canViewAnalytics: true },
        })).toBe(false);
        expect(canAccessModuleRegistryItem(agencyBilling!, {
            ...serviceAndFeatureAccess,
            permissions: { canManageBilling: true },
        })).toBe(true);
        expect(canAccessModuleRegistryItem(agencyBilling!, {
            ...serviceAndFeatureAccess,
            hasPermission: permission => permission === 'canManageBilling',
        })).toBe(true);
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

    it('defines Agency Engine as a canonical gated operating system', () => {
        const agency = getModuleRegistryItem('agency-engine');
        const clientPortal = getModuleRegistryItem('agency-client-portal');
        const agencyModules = getModulesByCanonicalSystem('agency').map(item => item.id);

        expect(agency).toMatchObject({
            canonicalSystem: 'agency',
            ownerSystem: 'agency-engine',
            requiredService: 'agency',
            requiredFeature: 'agencyModule',
            requiredPermission: 'canManageSettings',
        });
        expect(agency?.editableBy).toEqual(expect.arrayContaining(['ai-studio', 'global-assistant']));
        expect(agency?.readsFrom).toEqual(expect.arrayContaining([
            'businessBlueprint',
            'websiteBuilder',
            'storefrontBuilder',
            'ecommerce',
            'crm',
            'emailMarketing',
            'chatbot',
            'appointments',
            'restaurants',
            'realEstate',
            'finance',
            'analytics',
            'bioPage',
            'media',
        ]));
        expect(agency?.writesTo).toEqual(expect.arrayContaining([
            'businessBlueprint',
            'websiteBuilder',
            'storefrontBuilder',
            'ecommerce',
            'crm',
            'emailMarketing',
            'chatbot',
            'appointments',
            'restaurants',
            'realEstate',
            'bioPage',
            'media',
        ]));
        expect(agencyModules).toEqual(expect.arrayContaining([
            'agency-engine',
            'agency-client-360',
            'agency-client-provisioning',
            'agency-project-transfer',
            'agency-service-plans',
            'agency-billing',
            'agency-reports',
            'agency-white-label',
            'agency-client-portal',
            'agency-command-center',
        ]));
        expect(clientPortal).toMatchObject({
            route: '/portal/dashboard',
            requiredService: 'agency',
        });
        expect(clientPortal?.requiredFeature).toBeUndefined();
    });

    it('exposes a canonical Agency Engine operating system manifest for dashboard and assistant orchestration', () => {
        const manifest = getAgencyEngineOperatingSystemManifest();
        const requiredSystems = [
            'businessBlueprint',
            'websiteBuilder',
            'storefrontBuilder',
            'ecommerce',
            'crm',
            'emailMarketing',
            'appointments',
            'restaurants',
            'realEstate',
            'bioPage',
            'chatbot',
            'media',
            'finance',
            'analytics',
        ];

        expect(manifest).toMatchObject({
            id: 'agency-engine',
            requiredService: 'agency',
            requiredFeature: 'agencyModule',
        });
        expect(manifest.foundationalSystems).toEqual(expect.arrayContaining(requiredSystems));
        expect(manifest.moduleIds).toEqual(expect.arrayContaining([
            'agency-engine',
            'agency-command-center',
            'agency-client-360',
            'agency-client-provisioning',
            'agency-project-transfer',
            'agency-service-plans',
            'agency-billing',
            'agency-reports',
            'agency-white-label',
            'agency-client-portal',
        ]));
        expect(manifest.serviceAccessModuleIds).toEqual(expect.arrayContaining(manifest.moduleIds));
        expect(manifest.aiPoweredModuleIds).toEqual(expect.arrayContaining([
            'agency-command-center',
            'agency-client-360',
            'agency-client-provisioning',
            'agency-reports',
        ]));
        expect(manifest.globalAssistantModuleIds).toEqual(expect.arrayContaining([
            'agency-command-center',
            'agency-client-360',
            'agency-client-provisioning',
            'agency-project-transfer',
            'agency-reports',
        ]));
        expect(manifest.dashboardTabs).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'overview', surfaceId: 'command-center', moduleId: 'agency-command-center', route: '/agency/overview', requiredPermission: 'canViewAnalytics' }),
            expect.objectContaining({ id: 'new-client', surfaceId: 'client-provisioning', moduleId: 'agency-client-provisioning', route: '/agency/new-client', requiredPermission: 'canManageSettings' }),
            expect.objectContaining({ id: 'billing', surfaceId: 'billing', moduleId: 'agency-billing', route: '/agency/billing', requiredPermission: 'canManageBilling' }),
            expect.objectContaining({ id: 'projects', surfaceId: 'project-transfer', moduleId: 'agency-project-transfer', route: '/agency/projects', requiredPermission: 'canManageProjects' }),
            expect.objectContaining({ id: 'client-portal', surfaceId: 'client-portal', moduleId: 'agency-client-portal', route: '/agency/client-portal', requiredPermission: 'canManageSettings' }),
        ]));
        expect(new Set(manifest.dashboardTabs.map(tab => tab.id)).size).toBe(manifest.dashboardTabs.length);
        expect(manifest.client360Modules).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'businessBlueprint', canonicalSystem: 'businessBlueprint', ownerModuleId: 'ai-business-blueprint' }),
            expect.objectContaining({ id: 'website-builder', canonicalSystem: 'websiteBuilder', ownerModuleId: 'website-builder', route: '/agency/projects' }),
            expect.objectContaining({ id: 'storefront-builder', canonicalSystem: 'storefrontBuilder', ownerModuleId: 'storefront-builder', route: '/agency/projects' }),
            expect.objectContaining({ id: 'ecommerce', canonicalSystem: 'ecommerce', ownerModuleId: 'ecommerce-engine', route: '/agency/billing' }),
            expect.objectContaining({ id: 'crm-leads', canonicalSystem: 'crm', ownerModuleId: 'crm-leads' }),
            expect.objectContaining({ id: 'email-marketing', canonicalSystem: 'emailMarketing', ownerModuleId: 'email-marketing' }),
            expect.objectContaining({ id: 'appointments', canonicalSystem: 'appointments', ownerModuleId: 'appointments-engine' }),
            expect.objectContaining({ id: 'restaurants', canonicalSystem: 'restaurants', ownerModuleId: 'restaurant-engine' }),
            expect.objectContaining({ id: 'realty', canonicalSystem: 'realEstate', ownerModuleId: 'real-estate-engine' }),
            expect.objectContaining({ id: 'bio-page', canonicalSystem: 'bioPage', ownerModuleId: 'bio-page-engine' }),
            expect.objectContaining({ id: 'chatcore', canonicalSystem: 'chatbot', ownerModuleId: 'chatbot-engine' }),
            expect.objectContaining({ id: 'media-ai', canonicalSystem: 'media', ownerModuleId: 'media-assets' }),
            expect.objectContaining({ id: 'finance', canonicalSystem: 'finance', ownerModuleId: 'finance', route: '/agency/billing' }),
            expect.objectContaining({ id: 'analytics', canonicalSystem: 'analytics', ownerModuleId: 'analytics-engine', route: '/agency/analytics' }),
        ]));
        expect(new Set(manifest.client360Modules.map(module => module.id)).size).toBe(manifest.client360Modules.length);

        for (const moduleId of manifest.moduleIds) {
            const item = getModuleRegistryItem(moduleId);
            expect(item, moduleId).toBeDefined();
            expect(item?.canonicalSystem, moduleId).toBe('agency');
            expect(item?.requiredService, moduleId).toBe('agency');
        }

        for (const surface of manifest.operatingSurfaces) {
            const item = getModuleRegistryItem(surface.moduleId);
            if (surface.requiredPermission) {
                expect(item?.requiredPermission, surface.moduleId).toBe(surface.requiredPermission);
            }
            expect(surface.requiredSystems.length, surface.moduleId).toBeGreaterThan(0);
            if (surface.globalAssistantEnabled) {
                expect(item?.editableBy, surface.moduleId).toContain('global-assistant');
            }
        }

        for (const tab of manifest.dashboardTabs) {
            expect(manifest.moduleIds, tab.id).toContain(tab.moduleId);
            expect(manifest.operatingSurfaces.some(surface => surface.id === tab.surfaceId), tab.id).toBe(true);
        }

        for (const module of manifest.client360Modules) {
            const item = getModuleRegistryItem(module.ownerModuleId);
            expect(item, module.id).toBeDefined();
            expect(item?.canonicalSystem, module.id).toBe(module.canonicalSystem);
            expect(manifest.foundationalSystems, module.id).toContain(module.canonicalSystem);
            expect(module.labelKey, module.id).toMatch(/^dashboard\.agency\.client360\./);
            expect(module.descriptionKey, module.id).toMatch(/^dashboard\.agency\.client360\./);
            expect(module.activationSignals.length, module.id).toBeGreaterThan(0);
            if (module.route) expect(module.route, module.id).toMatch(/^\/agency\//);
        }
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
            requiredService: 'bioPage',
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

    it('registers Content Studio and Content Factory Admin as media blueprint surfaces', () => {
        const contentStudio = getModuleRegistryItem('contentStudio');
        const contentFactoryAdmin = getModuleRegistryItem('contentFactoryAdmin');
        const mediaRelated = getModulesByCanonicalSystem('media').map(item => item.id);

        expect(contentStudio).toMatchObject({
            canonicalSystem: 'media',
            ownerSystem: 'media-ai',
            view: 'content-studio',
            route: '/content-studio',
            surface: 'user',
            requiredPlan: 'individual',
            requiredService: 'aiFeatures',
            requiredFeature: 'aiImageGeneration',
        });
        expect(contentStudio?.readsFrom).toEqual(expect.arrayContaining([
            'businessBlueprint',
            'websiteBuilder',
            'storefrontBuilder',
            'ecommerce',
            'crm',
            'emailMarketing',
            'chatbot',
            'appointments',
            'restaurants',
            'realEstate',
            'bioPage',
            'analytics',
        ]));
        expect(contentStudio?.writesTo).toEqual(expect.arrayContaining([
            'businessBlueprint',
            'media',
            'websiteBuilder',
            'storefrontBuilder',
            'emailMarketing',
            'bioPage',
            'analytics',
        ]));

        expect(contentFactoryAdmin).toMatchObject({
            canonicalSystem: 'media',
            ownerSystem: 'media-ai',
            route: '/admin/content-factory',
            surface: 'admin',
            requiredRole: 'admin',
            requiredPlan: 'individual',
            requiredService: 'aiFeatures',
            requiredFeature: 'aiImageGeneration',
        });
        expect(mediaRelated).toEqual(expect.arrayContaining([
            'media-assets',
            'contentStudio',
            'contentFactoryAdmin',
        ]));
        expect(canAccessModuleRegistryItem(contentStudio!, {
            currentPlan: 'free',
            canAccessService: service => service === 'aiFeatures',
            hasPlanFeature: feature => feature === 'aiImageGeneration',
        })).toBe(false);
        expect(canAccessModuleRegistryItem(contentStudio!, {
            currentPlan: 'individual',
            canAccessService: service => service === 'aiFeatures',
            hasPlanFeature: feature => feature === 'aiImageGeneration',
        })).toBe(true);
    });
});
