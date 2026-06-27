import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRouteConfig, hasRouteAccess, routeConfigs, ROUTES } from '../../routes/config';

describe('route config', () => {
    it('registers the white-label client portal as authenticated workspace routes', () => {
        const portalHome = getRouteConfig(ROUTES.PORTAL_HOME);
        const portalDashboard = getRouteConfig(ROUTES.PORTAL_DASHBOARD);

        expect(portalHome).toMatchObject({
            path: ROUTES.PORTAL_HOME,
            type: 'private',
            requiresAuth: true,
            requiresEmailVerified: true,
        });
        expect(portalDashboard).toMatchObject({
            path: ROUTES.PORTAL_DASHBOARD,
            type: 'private',
            requiresAuth: true,
            requiresEmailVerified: true,
            parent: ROUTES.PORTAL_HOME,
        });
        expect(portalDashboard?.roles).toBeUndefined();
        expect(hasRouteAccess(portalDashboard!, undefined, true, true)).toBe(true);
        expect(hasRouteAccess(portalDashboard!, undefined, false, true)).toBe(false);
    });

    it('declares service gates for service-backed public and private routes', () => {
        expect(getRouteConfig(ROUTES.STORE)).toMatchObject({
            requiredService: 'ecommerce',
            requiredFeature: 'ecommerceEnabled',
            moduleId: 'ecommerce-engine',
        });
        expect(getRouteConfig(ROUTES.STORE_CHECKOUT)).toMatchObject({
            requiredService: 'ecommerce',
            moduleId: 'ecommerce-engine',
        });
        expect(getRouteConfig(ROUTES.PUBLIC_RESTAURANT_MENU)).toMatchObject({
            requiredService: 'restaurants',
            moduleId: 'restaurant-engine',
        });
        expect(getRouteConfig(ROUTES.PUBLIC_BIO)).toMatchObject({
            requiredService: 'bioPage',
            moduleId: 'bio-page-engine',
        });
        expect(getRouteConfig(ROUTES.ASSETS)).toMatchObject({
            requiredService: 'aiFeatures',
            requiredFeature: 'aiImageGeneration',
            moduleId: 'media-assets',
        });
        expect(getRouteConfig(ROUTES.CMS)).toMatchObject({
            requiredService: 'cms',
            requiredFeature: 'cmsEnabled',
            moduleId: 'cms-engine',
        });
        expect(getRouteConfig(ROUTES.AI_ASSISTANT)).toMatchObject({
            requiredService: 'chatbot',
            requiredFeature: 'chatbotEnabled',
            moduleId: 'chatbot-engine',
        });
        expect(getRouteConfig(ROUTES.BIOPAGE)).toMatchObject({
            requiredService: 'bioPage',
            moduleId: 'bio-page-engine',
        });
        expect(getRouteConfig(ROUTES.AGENCY_SIGNUP)).toMatchObject({
            requiredService: 'agency',
            moduleId: 'agency-engine',
        });
    });

    it('keeps service-backed visible routes tied to a registry module', () => {
        const missingModuleIds = routeConfigs
            .filter(route => route.showInNav && route.requiredService)
            .filter(route => !route.moduleId)
            .map(route => route.path);

        expect(missingModuleIds).toEqual([]);
    });

    it('guards private and admin service routes through scoped service access', () => {
        const routerSource = readFileSync(resolve(process.cwd(), 'routes/Router.tsx'), 'utf8');

        expect(routerSource).toContain("import { useServiceAccess } from '../hooks/useServiceAccess';");
        expect(routerSource).toContain('resolveRouteServiceAccess');
        expect(routerSource).toContain('routeNeedsScopedServiceAccess');
        expect(routerSource).toContain('isAuthenticated &&');
        expect(routerSource).toContain('isPrivateRoute || isAdminRoute');
        expect(routerSource).toContain('serviceId: route.requiredService');
        expect(routerSource).toContain('featureKey: route.requiredFeature');
        expect(routerSource).toContain('moduleId: route.moduleId');
        expect(routerSource).toContain('requiredPermission: route.requiredPermission');
        expect(routerSource).toContain('!isScopedRouteAccessAllowed');
    });

    it('routes agency dashboards through canonical Agency Engine submodules', () => {
        expect(getRouteConfig(ROUTES.AGENCY)).toMatchObject({
            requiredService: 'agency',
            requiredFeature: 'agencyModule',
            moduleId: 'agency-engine',
            requiredPermission: 'canManageSettings',
        });
        expect(getRouteConfig(ROUTES.AGENCY_OVERVIEW)).toMatchObject({
            moduleId: 'agency-command-center',
            requiredPermission: 'canViewAnalytics',
        });
        expect(getRouteConfig(ROUTES.AGENCY_ANALYTICS)).toMatchObject({
            moduleId: 'agency-command-center',
            requiredPermission: 'canViewAnalytics',
        });
        expect(getRouteConfig(ROUTES.AGENCY_BILLING)).toMatchObject({
            moduleId: 'agency-billing',
            requiredPermission: 'canManageBilling',
        });
        expect(getRouteConfig(ROUTES.AGENCY_REPORTS)).toMatchObject({
            moduleId: 'agency-reports',
            requiredPermission: 'canViewAnalytics',
        });
        expect(getRouteConfig(ROUTES.AGENCY_NEW_CLIENT)).toMatchObject({
            moduleId: 'agency-client-provisioning',
            requiredPermission: 'canManageSettings',
        });
        expect(getRouteConfig(ROUTES.AGENCY_ADDONS)).toMatchObject({
            moduleId: 'agency-service-plans',
            requiredPermission: 'canManageBilling',
        });
        expect(getRouteConfig(ROUTES.AGENCY_PLANS)).toMatchObject({
            moduleId: 'agency-service-plans',
            requiredPermission: 'canManageBilling',
        });
        expect(getRouteConfig(ROUTES.AGENCY_PROJECTS)).toMatchObject({
            moduleId: 'agency-project-transfer',
            requiredPermission: 'canManageProjects',
        });
        expect(getRouteConfig(ROUTES.PORTAL_HOME)).toMatchObject({
            requiredService: 'agency',
            requiredFeature: 'agencyModule',
            moduleId: 'agency-client-portal',
        });
        expect(getRouteConfig(ROUTES.PORTAL_DASHBOARD)).toMatchObject({
            requiredService: 'agency',
            requiredFeature: 'agencyModule',
            moduleId: 'agency-client-portal',
        });

        for (const path of [
            ROUTES.AGENCY_LANDING,
            ROUTES.AGENCY_CMS,
            ROUTES.AGENCY_NAVIGATION,
            ROUTES.AGENCY_WHITE_LABEL,
        ]) {
            expect(getRouteConfig(path)).toMatchObject({
                requiredService: 'agency',
                requiredFeature: 'agencyModule',
                moduleId: 'agency-white-label',
                requiredPermission: 'canManageSettings',
            });
        }
    });
});
