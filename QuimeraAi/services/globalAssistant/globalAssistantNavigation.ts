import type { AssistantLifecycleResult } from './globalAssistantRuntime';
import { ROUTES } from '../../routes/config';

export interface OperatingLayerNavigation {
    type?: string;
    view?: string | null;
    adminView?: string | null;
    moduleItem?: string | null;
    projectId?: string | null;
    projectName?: string | null;
    message?: string | null;
}

export interface OperatingLayerNavigationTargets {
    targetProjectId: string | null;
    targetView: string | null;
    adminView: string | null;
    projectName: string | null;
    moduleItem: string | null;
    message: string | null;
}

export interface OperatingLayerProjectLoadRequest {
    projectId: string;
    fromAdmin: boolean;
    navigateToEditor: false;
}

const ECOMMERCE_MODULE_ROUTES: Record<string, string> = {
    storefront: `${ROUTES.ECOMMERCE}/storefront`,
    store: `${ROUTES.ECOMMERCE}/storefront`,
    tienda: `${ROUTES.ECOMMERCE}/storefront`,
    orders: `${ROUTES.ECOMMERCE}/orders`,
    products: `${ROUTES.ECOMMERCE}/products`,
    categories: `${ROUTES.ECOMMERCE}/categories`,
    discounts: `${ROUTES.ECOMMERCE}/discounts`,
    analytics: `${ROUTES.ECOMMERCE}/analytics`,
    settings: `${ROUTES.ECOMMERCE}/settings`,
};

const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const readString = (value: unknown): string | null => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || null;
};

export const readOperatingLayerNavigationTargets = (
    navigation: OperatingLayerNavigation,
): OperatingLayerNavigationTargets => ({
    targetProjectId: readString(navigation.projectId),
    targetView: readString(navigation.view),
    adminView: readString(navigation.adminView),
    projectName: readString(navigation.projectName),
    moduleItem: readString(navigation.moduleItem),
    message: readString(navigation.message),
});

export const findOperatingLayerNavigation = (result: AssistantLifecycleResult): OperatingLayerNavigation | null => {
    let latestNavigation: OperatingLayerNavigation | null = null;
    for (const action of result.actions) {
        const lifecycleResult = asRecord(action.metadata?.result);
        const afterSnapshot = asRecord(lifecycleResult.afterSnapshot ?? action.afterSnapshot);
        const navigation = asRecord(afterSnapshot.navigation);
        if (readString(navigation.view)) latestNavigation = navigation as OperatingLayerNavigation;
    }
    return latestNavigation;
};

export const buildOperatingLayerProjectLoadRequest = (
    navigation: OperatingLayerNavigation,
): OperatingLayerProjectLoadRequest | null => {
    const { targetProjectId, targetView } = readOperatingLayerNavigationTargets(navigation);
    if (!targetProjectId) return null;

    return {
        projectId: targetProjectId,
        fromAdmin: targetView === 'superadmin',
        navigateToEditor: false,
    };
};

export const resolveOperatingLayerModuleRoute = (
    targetView: string | null | undefined,
    moduleItem?: string | null,
): string | null => {
    if (!targetView) return null;

    if (targetView === 'ecommerce') {
        const normalizedModuleItem = moduleItem?.trim().toLowerCase();
        return normalizedModuleItem
            ? ECOMMERCE_MODULE_ROUTES[normalizedModuleItem] || ROUTES.ECOMMERCE
            : ROUTES.ECOMMERCE;
    }

    return null;
};

export const resolveOperatingLayerNavigationRoute = (
    navigation: OperatingLayerNavigation,
): string | null => {
    const { targetView, moduleItem } = readOperatingLayerNavigationTargets(navigation);
    return resolveOperatingLayerModuleRoute(targetView, moduleItem);
};

export const formatOperatingLayerNavigationMessage = (
    navigation: OperatingLayerNavigation,
): string => {
    const { targetView, projectName, moduleItem, message } = readOperatingLayerNavigationTargets(navigation);
    const baseMessage = message || `Opened ${targetView || 'requested view'}.`;
    const projectSuffix = projectName ? ` Project: ${projectName}.` : '';
    const itemSuffix = moduleItem ? ` Target: ${moduleItem}.` : '';
    return `${baseMessage}${projectSuffix}${itemSuffix}`;
};
