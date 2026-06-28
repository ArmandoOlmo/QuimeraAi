import { describe, expect, it } from 'vitest';
import {
    buildOperatingLayerProjectLoadRequest,
    findOperatingLayerNavigation,
    formatOperatingLayerNavigationMessage,
    readOperatingLayerNavigationTargets,
    resolveOperatingLayerModuleRoute,
    resolveOperatingLayerNavigationRoute,
} from '../../services/globalAssistant/globalAssistantNavigation.ts';
import type { AssistantLifecycleResult } from '../../services/globalAssistant/globalAssistantRuntime.ts';

const lifecycleResult = {
    actions: [
        {
            afterSnapshot: {
                navigation: {
                    type: 'view',
                    view: 'dashboard',
                    projectId: 'project-1',
                    projectName: 'Casa Luna',
                    message: 'Switch active project context.',
                },
            },
            metadata: {},
        },
        {
            afterSnapshot: {
                navigation: {
                    type: 'view',
                    view: 'ecommerce',
                    moduleItem: 'orders',
                    projectId: 'project-2',
                    projectName: 'Ocean Clinic',
                    message: 'Open ecommerce orders.',
                },
            },
            metadata: {},
        },
    ],
} as unknown as AssistantLifecycleResult;

describe('globalAssistantNavigation', () => {
    it('finds the latest navigation result from applied Operating Layer actions', () => {
        expect(findOperatingLayerNavigation(lifecycleResult)).toMatchObject({
            view: 'ecommerce',
            moduleItem: 'orders',
            projectId: 'project-2',
        });
    });

    it('loads target projects without implicit editor redirects', () => {
        expect(buildOperatingLayerProjectLoadRequest({
            view: 'ecommerce',
            projectId: 'project-2',
        })).toEqual({
            projectId: 'project-2',
            fromAdmin: false,
            navigateToEditor: false,
        });

        expect(buildOperatingLayerProjectLoadRequest({
            view: 'editor',
            projectId: 'project-2',
        })).toEqual({
            projectId: 'project-2',
            fromAdmin: false,
            navigateToEditor: false,
        });
    });

    it('keeps module targets and admin navigation explicit', () => {
        const navigation = {
            view: 'superadmin',
            adminView: 'tenants',
            moduleItem: 'storefront',
            projectId: 'project-3',
            projectName: 'Tenant Ops',
            message: 'Open tenant in Super Admin.',
        };

        expect(readOperatingLayerNavigationTargets(navigation)).toMatchObject({
            targetProjectId: 'project-3',
            targetView: 'superadmin',
            adminView: 'tenants',
            moduleItem: 'storefront',
        });
        expect(buildOperatingLayerProjectLoadRequest(navigation)).toMatchObject({
            fromAdmin: true,
            navigateToEditor: false,
        });
        expect(formatOperatingLayerNavigationMessage(navigation)).toBe(
            'Open tenant in Super Admin. Project: Tenant Ops. Target: storefront.',
        );
    });

    it('routes explicit ecommerce module targets to stable subviews', () => {
        expect(resolveOperatingLayerModuleRoute('ecommerce', 'storefront')).toBe('/ecommerce/storefront');
        expect(resolveOperatingLayerModuleRoute('ecommerce', 'orders')).toBe('/ecommerce/orders');
        expect(resolveOperatingLayerNavigationRoute({
            view: 'ecommerce',
            moduleItem: 'storefront',
            projectId: 'project-2',
        })).toBe('/ecommerce/storefront');
    });
});
