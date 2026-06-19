import type { PageSection } from '../../types';
import type { StorefrontSectionKind } from '../../types/storefrontRenderer';
import type { StorefrontEditorSection } from '../../types/storefrontEditor';
import { storefrontBlockRegistry, isStorefrontBlockKind } from './blockRegistry';
import {
    isLegacyStorefrontSectionKind,
    isStorefrontSectionKind,
    storefrontSectionRegistry,
} from './registry';

export type StorefrontEditorConfigMode = 'draft' | 'published';

export interface ResolvedStorefrontEditorConfig {
    componentOrder: StorefrontSectionKind[];
    sectionVisibility: Record<string, boolean>;
    sectionSettings: Record<string, Record<string, unknown>>;
    sections: StorefrontEditorSection[];
    themePresetId?: string;
    themeSettings?: Record<string, unknown>;
    theme?: Record<string, unknown>;
    source: 'draft' | 'published' | 'legacy';
}

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const toRecord = (value: unknown): Record<string, any> =>
    isRecord(value) ? value : {};

const normalizeStorefrontOrder = (
    value: unknown,
    options: { legacyOnly?: boolean } = {},
): StorefrontSectionKind[] => {
    if (!Array.isArray(value)) return [];

    return value
        .map(item => {
            if (typeof item === 'string') return item;
            if (isRecord(item)) return item.type || item.kind || item.id;
            return null;
        })
        .filter(options.legacyOnly ? isLegacyStorefrontSectionKind : isStorefrontSectionKind);
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

const normalizeEditorBlocks = (value: unknown, parentId: string): StorefrontEditorSection['blocks'] => {
    if (!Array.isArray(value)) return [];

    return value.reduce((acc, item, index) => {
        if (!isRecord(item)) return acc;
        const kind = item.kind;
        if (!isStorefrontBlockKind(kind)) return acc;
        const registryItem = storefrontBlockRegistry[kind];
        acc.push({
            id: typeof item.id === 'string' ? item.id : `${parentId}-${kind}-${index + 1}`,
            kind,
            label: typeof item.label === 'string' ? item.label : registryItem.label,
            enabled: item.enabled !== false,
            order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
            settings: {
                ...registryItem.defaultSettings,
                ...toRecord(item.settings),
            },
            metadata: isRecord(item.metadata) ? item.metadata : undefined,
        });
        return acc;
    }, [] as StorefrontEditorSection['blocks']);
};

const normalizeEditorSections = (value: unknown): StorefrontEditorSection[] => {
    if (!Array.isArray(value)) return [];

    return value.reduce((acc, item, index) => {
        if (!isRecord(item)) return acc;
        const kind = item.kind || item.type;
        if (!isStorefrontSectionKind(kind)) return acc;
        const registryItem = storefrontSectionRegistry[kind];
        const id = typeof item.id === 'string' ? item.id : `storefront-${kind}-${index + 1}`;

        acc.push({
            id,
            kind,
            label: typeof item.label === 'string' ? item.label : registryItem.label,
            group: item.group || registryItem.group || 'template',
            enabled: item.enabled !== false,
            order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
            settings: {
                ...registryItem.defaultSettings,
                ...toRecord(item.settings),
            },
            blocks: normalizeEditorBlocks(item.blocks, id),
            metadata: isRecord(item.metadata) ? item.metadata : undefined,
        });
        return acc;
    }, [] as StorefrontEditorSection[]).sort((a, b) => a.order - b.order);
};

const normalizeSettingsFromEditorSections = (sections: StorefrontEditorSection[]): Record<string, Record<string, unknown>> =>
    sections.reduce((acc, section) => {
        acc[section.kind] = {
            ...toRecord(acc[section.kind]),
            ...section.settings,
        };
        return acc;
    }, {} as Record<string, Record<string, unknown>>);

function getPageData(projectData: any): Record<string, any> {
    const rootData = toRecord(projectData?.data);
    return isRecord(rootData.data) ? rootData.data : rootData;
}

function getStorefrontEditor(projectData: any): Record<string, any> {
    const rootData = toRecord(projectData?.data);
    const pageData = getPageData(projectData);
    return [
        projectData?.storefrontEditor,
        rootData.storefrontEditor,
        pageData.storefrontEditor,
    ].find(isRecord) || {};
}

function readConfigRecord(editorState: Record<string, any>, mode: StorefrontEditorConfigMode): Record<string, any> | null {
    const preferred = toRecord(editorState[mode]);
    if (Object.keys(preferred).length > 0) return preferred;

    const fallbackMode = mode === 'published' ? 'draft' : 'published';
    const fallback = toRecord(editorState[fallbackMode]);
    if (Object.keys(fallback).length > 0) return fallback;

    return null;
}

export function resolveStorefrontEditorConfig(
    projectData: any,
    options: { mode?: StorefrontEditorConfigMode } = {},
): ResolvedStorefrontEditorConfig {
    const mode = options.mode || 'published';
    const rootData = toRecord(projectData?.data);
    const pageData = getPageData(projectData);
    const editorState = getStorefrontEditor(projectData);
    const selectedConfig = readConfigRecord(editorState, mode);
    const legacyOrder = normalizeStorefrontOrder(
        projectData?.componentOrder ||
        rootData.componentOrder ||
        pageData.componentOrder,
        { legacyOnly: true },
    );
    const selectedOrder = normalizeStorefrontOrder(selectedConfig?.componentOrder || selectedConfig?.sections);
    const legacyVisibility = {
        ...toRecord(rootData.sectionVisibility),
        ...toRecord(pageData.sectionVisibility),
        ...toRecord(projectData?.sectionVisibility),
    } as Record<string, boolean>;
    const selectedVisibility = toRecord(selectedConfig?.sectionVisibility) as Record<string, boolean>;
    const editorSections = normalizeEditorSections(selectedConfig?.sections);
    const selectedSettings = {
        ...normalizeSettingsFromEditorSections(editorSections),
        ...normalizeSettings(selectedConfig?.sectionSettings),
    };

    return {
        componentOrder: selectedOrder.length > 0 ? selectedOrder : legacyOrder,
        sectionVisibility: {
            ...legacyVisibility,
            ...selectedVisibility,
        },
        sectionSettings: selectedSettings,
        sections: editorSections,
        themePresetId: String(
            selectedConfig?.themePresetId ||
            selectedConfig?.themePreset ||
            editorState.themePresetId ||
            editorState.themePreset ||
            '',
        ) || undefined,
        themeSettings: toRecord(selectedConfig?.themeSettings),
        theme: toRecord(selectedConfig?.theme),
        source: selectedConfig ? (selectedConfig === editorState.published ? 'published' : 'draft') : 'legacy',
    };
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
        ...(config.sections.length > 0 ? { storefrontResolvedSections: config.sections } : {}),
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
