import type { PageSection } from '../../types';
import type { StorefrontSectionKind } from '../../types/storefrontRenderer';
import { STOREFRONT_SECTION_KINDS, isStorefrontSectionKind } from './registry';

export type StorefrontEditorConfigMode = 'draft' | 'published';

export interface ResolvedStorefrontEditorConfig {
    componentOrder: StorefrontSectionKind[];
    sectionVisibility: Record<string, boolean>;
    sectionSettings: Record<string, Record<string, unknown>>;
    themeSettings?: Record<string, unknown>;
    source: 'draft' | 'published' | 'legacy';
}

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const toRecord = (value: unknown): Record<string, any> =>
    isRecord(value) ? value : {};

const normalizeStorefrontOrder = (value: unknown): StorefrontSectionKind[] => {
    if (!Array.isArray(value)) return [];

    return value
        .map(item => {
            if (typeof item === 'string') return item;
            if (isRecord(item)) return item.type || item.kind || item.id;
            return null;
        })
        .filter(isStorefrontSectionKind);
};

const normalizeSettings = (value: unknown): Record<string, Record<string, unknown>> => {
    const record = toRecord(value);
    return Object.entries(record).reduce((acc, [key, settings]) => {
        if (isStorefrontSectionKind(key) && isRecord(settings)) {
            acc[key] = { ...settings };
        }
        return acc;
    }, {} as Record<string, Record<string, unknown>>);
};

const appendDefaultStorefrontSections = (order: StorefrontSectionKind[]): StorefrontSectionKind[] => [
    ...order,
    ...STOREFRONT_SECTION_KINDS.filter(section => !order.includes(section)),
];

const buildVisibleStorefrontSections = (): Record<string, boolean> =>
    STOREFRONT_SECTION_KINDS.reduce((acc, section) => {
        acc[section] = true;
        return acc;
    }, {} as Record<string, boolean>);

const buildEnabledStorefrontSectionSettings = (): Record<string, Record<string, unknown>> =>
    STOREFRONT_SECTION_KINDS.reduce((acc, section) => {
        acc[section] = { enabled: true };
        return acc;
    }, {} as Record<string, Record<string, unknown>>);

export function resolveStorefrontPageData(projectData: any): Record<string, any> {
    const rootData = toRecord(projectData?.data);
    return isRecord(rootData.data) ? rootData.data : rootData;
}

export function resolveStorefrontEditorState(projectData: any): Record<string, any> {
    const rootData = toRecord(projectData?.data);
    const pageData = resolveStorefrontPageData(projectData);
    return [
        projectData?.storefrontEditor,
        rootData.storefrontEditor,
        pageData.storefrontEditor,
    ].find(isRecord) || {};
}

function readConfigRecord(editorState: Record<string, any>, mode: StorefrontEditorConfigMode): Record<string, any> | null {
    const preferred = toRecord(editorState[mode]);
    if (Object.keys(preferred).length > 0) return preferred;

    if (mode === 'draft') {
        const fallback = toRecord(editorState.published);
        if (Object.keys(fallback).length > 0) return fallback;
    }

    return null;
}

export function resolveStorefrontEditorConfig(
    projectData: any,
    options: { mode?: StorefrontEditorConfigMode } = {},
): ResolvedStorefrontEditorConfig {
    const mode = options.mode || 'published';
    const rootData = toRecord(projectData?.data);
    const pageData = resolveStorefrontPageData(projectData);
    const editorState = resolveStorefrontEditorState(projectData);
    const selectedConfig = readConfigRecord(editorState, mode);
    const legacyOrder = normalizeStorefrontOrder(
        projectData?.componentOrder ||
        rootData.componentOrder ||
        pageData.componentOrder,
    );
    const selectedOrder = normalizeStorefrontOrder(selectedConfig?.componentOrder || selectedConfig?.sections);
    const hasExplicitEditorOrder = Boolean(
        selectedConfig &&
        (Array.isArray(selectedConfig.componentOrder) || Array.isArray(selectedConfig.sections))
    );
    const selectedVisibility = toRecord(selectedConfig?.sectionVisibility) as Record<string, boolean>;
    const defaultVisibility = buildVisibleStorefrontSections();
    const legacyVisibility = toRecord(
        projectData?.sectionVisibility ||
        rootData.sectionVisibility ||
        pageData.sectionVisibility,
    ) as Record<string, boolean>;
    const selectedSettings = selectedConfig
        ? normalizeSettings(selectedConfig.sectionSettings)
        : mode === 'draft'
            ? buildEnabledStorefrontSectionSettings()
            : {};

    const resolvedOrder = hasExplicitEditorOrder
        ? selectedOrder
        : selectedConfig
            ? appendDefaultStorefrontSections(selectedOrder.length > 0 ? selectedOrder : legacyOrder)
            : mode === 'draft'
                ? appendDefaultStorefrontSections(legacyOrder)
                : legacyOrder;
    const resolvedVisibility = selectedConfig
        ? {
            ...defaultVisibility,
            ...selectedVisibility,
        }
        : mode === 'draft'
            ? defaultVisibility
            : legacyVisibility;

    return {
        componentOrder: resolvedOrder,
        sectionVisibility: resolvedVisibility,
        sectionSettings: selectedSettings,
        themeSettings: toRecord(selectedConfig?.themeSettings),
        source: selectedConfig ? (selectedConfig === editorState.published ? 'published' : 'draft') : 'legacy',
    };
}

export function resolveStorefrontEditorInitialOrder(
    projectData: any,
    options: { mode?: StorefrontEditorConfigMode } = {},
): StorefrontSectionKind[] {
    const config = resolveStorefrontEditorConfig(projectData, options);

    if (config.source !== 'legacy') return config.componentOrder;
    return config.componentOrder.length > 0 ? config.componentOrder : appendDefaultStorefrontSections([]);
}

export function applyResolvedStorefrontEditorConfig(
    projectData: any,
    options: { mode?: StorefrontEditorConfigMode } = {},
): any {
    const config = resolveStorefrontEditorConfig(projectData, options);
    if (config.componentOrder.length === 0 && Object.keys(config.sectionVisibility).length === 0) {
        return projectData;
    }

    const rootData = toRecord(projectData?.data);
    const hasNestedData = isRecord(rootData.data);
    const pageData = hasNestedData ? toRecord(rootData.data) : rootData;
    const nextPageData = {
        ...pageData,
        ...config.sectionSettings,
    };

    const nextData = hasNestedData
        ? {
            ...rootData,
            data: nextPageData,
            componentOrder: config.componentOrder as PageSection[],
            sectionVisibility: config.sectionVisibility,
        }
        : {
            ...nextPageData,
            componentOrder: config.componentOrder as PageSection[],
            sectionVisibility: config.sectionVisibility,
        };

    return {
        ...projectData,
        data: nextData,
        componentOrder: config.componentOrder as PageSection[],
        sectionVisibility: config.sectionVisibility,
    };
}
