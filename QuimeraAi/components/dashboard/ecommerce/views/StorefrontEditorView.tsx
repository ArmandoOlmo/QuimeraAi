import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../../supabase';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useProject } from '../../../../contexts/project';
import type { PageSection } from '../../../../types';
import { DEFAULT_STOREFRONT_THEME, type StorefrontThemeSettings } from '../../../../types/ecommerce';
import type { StorefrontSectionKind } from '../../../../types/storefrontRenderer';
import type { StorefrontThemePresetId } from '../../../../types/storefrontTheme';
import type {
    SelectedStorefrontNode,
    StorefrontEditorBlock,
    StorefrontEditorBlockKind,
    StorefrontEditorColorScheme,
    StorefrontEditorGroup,
    StorefrontEditorSection,
    StorefrontEditorSnapshot,
} from '../../../../types/storefrontEditor';
import {
    isStorefrontSectionKind,
    resolveStorefrontEditorConfig,
    storefrontBlockRegistry,
    storefrontSectionRegistry,
    STOREFRONT_SECTION_KINDS,
    validateStorefrontSectionSettings,
} from '../../../../utils/storefrontRenderer';
import {
    getStorefrontCatalogSize,
    STOREFRONT_THEME_PRESETS,
} from '../../../../utils/storefrontTheme';
import { useEcommerceContext } from '../EcommerceContext';
import { useProducts } from '../hooks/useProducts';
import { useStoreSettings } from '../hooks/useStoreSettings';
import StorefrontEditorCanvas from '../storefront-editor/StorefrontEditorCanvas';
import StorefrontEditorInspector from '../storefront-editor/StorefrontEditorInspector';
import StorefrontEditorNavigator from '../storefront-editor/StorefrontEditorNavigator';
import StorefrontEditorSectionTree from '../storefront-editor/StorefrontEditorSectionTree';
import StorefrontEditorStatusBar from '../storefront-editor/StorefrontEditorStatusBar';
import StorefrontEditorTopbar from '../storefront-editor/StorefrontEditorTopbar';
import type { StorefrontEditorPreviewMode } from '../storefront-editor/StorefrontEditorDeviceSwitch';
import StorefrontThemeEditorShell from '../storefront-editor/StorefrontThemeEditorShell';

type TemplateState = 'draft' | 'published';

const STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX = 'quimera:storefront-editor-preview:';
const GROUP_ORDER: StorefrontEditorGroup[] = ['header', 'template', 'footer', 'overlay'];

const fallbackSectionKinds: StorefrontSectionKind[] = [
    'announcementBar',
    'hero',
    'categoryTiles',
    'featuredCollection',
    'trustBadges',
    'storeFooter',
    'newsletterPopup',
    'cartDrawer',
];

const sectionLabelFallback: Partial<Record<StorefrontSectionKind, string>> = {
    announcementBar: 'Barra de anuncios',
    header: 'Header',
    hero: 'Hero',
    productHero: 'Hero de producto',
    categoryTiles: 'Tiles de categorías',
    categoryGrid: 'Grid de categorías',
    featuredCollection: 'Colección destacada',
    productGrid: 'Grid de productos',
    featuredProducts: 'Productos destacados',
    promoBanner: 'Banner promocional',
    imageWithText: 'Imagen con texto',
    trustBadges: 'Sellos de confianza',
    testimonials: 'Testimonios',
    newsletter: 'Newsletter',
    faq: 'FAQ',
    storeFooter: 'Footer',
    policiesAndLinks: 'Políticas y enlaces',
    newsletterPopup: 'Newsletter popup',
    cartDrawer: 'Cart drawer',
    saleCountdown: 'Cuenta regresiva',
    collectionBanner: 'Banner de colección',
    recentlyViewed: 'Vistos recientemente',
    productReviews: 'Reseñas de producto',
    productBundle: 'Bundle de productos',
};

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const toRecord = (value: unknown): Record<string, any> => (
    isRecord(value) ? { ...value } : {}
);

const stableStringify = (value: unknown): string => {
    try {
        return JSON.stringify(value ?? null);
    } catch {
        return String(value ?? '');
    }
};

const getProjectPageData = (project: any): Record<string, any> => {
    const dataPayload = toRecord(project?.data);
    return isRecord(dataPayload.data) ? dataPayload.data : dataPayload;
};

const getProjectBusinessBlueprint = (project: any, pageData?: Record<string, any>): Record<string, any> | undefined => {
    const dataPayload = toRecord(project?.data);
    return [
        project?.businessBlueprint,
        dataPayload.businessBlueprint,
        isRecord(dataPayload.data) ? dataPayload.data.businessBlueprint : undefined,
        pageData?.businessBlueprint,
    ].find(isRecord);
};

const findBlueprintSection = (
    project: any,
    pageData: Record<string, any>,
    kind: StorefrontSectionKind,
): Record<string, any> | undefined => {
    const sections = getProjectBusinessBlueprint(project, pageData)?.storefrontBlueprint?.sections;
    if (!Array.isArray(sections)) return undefined;
    return sections.find((section: any) => section?.type === kind && isRecord(section));
};

const getSectionLabel = (kind: StorefrontSectionKind): string =>
    sectionLabelFallback[kind] || storefrontSectionRegistry[kind].label;

const getProjectHeaderData = (project: any, pageData: Record<string, any>): Record<string, any> => (
    toRecord(project?.header).colors ? toRecord(project?.header) : toRecord(pageData.header)
);

const mergeTheme = (
    currentTheme: StorefrontThemeSettings,
    presetId: StorefrontThemePresetId,
): StorefrontThemeSettings => ({
    ...DEFAULT_STOREFRONT_THEME,
    ...currentTheme,
    ...STOREFRONT_THEME_PRESETS[presetId].theme,
});

const buildPreviewTheme = (project: any, storefrontTheme: StorefrontThemeSettings): Record<string, any> => ({
    ...toRecord(project?.theme),
    pageBackground: storefrontTheme.backgroundColor,
    globalColors: {
        ...toRecord(project?.theme?.globalColors),
        primary: storefrontTheme.primaryColor,
        secondary: storefrontTheme.secondaryColor,
        accent: storefrontTheme.accentColor,
        background: storefrontTheme.backgroundColor,
        surface: storefrontTheme.cardBackground,
        text: storefrontTheme.textColor,
        heading: storefrontTheme.headingColor,
        border: storefrontTheme.borderColor,
    },
});

const buildPreviewHeader = (
    project: any,
    pageData: Record<string, any>,
    storefrontTheme: StorefrontThemeSettings,
): Record<string, any> => {
    const header = getProjectHeaderData(project, pageData);

    return {
        ...header,
        colors: {
            ...toRecord(header.colors),
            background: storefrontTheme.headerBackground,
            text: storefrontTheme.textColor,
            accent: storefrontTheme.primaryColor,
        },
    };
};

const buildColorSchemes = (theme: StorefrontThemeSettings): StorefrontEditorColorScheme[] => [
    {
        id: 'scheme1',
        name: 'Default',
        background: theme.backgroundColor,
        foreground: theme.textColor,
        primary: theme.primaryColor,
        secondary: theme.secondaryColor,
        accent: theme.accentColor,
        border: theme.borderColor,
    },
    {
        id: 'scheme2',
        name: 'Accent',
        background: theme.primaryColor,
        foreground: theme.buttonText,
        primary: theme.accentColor,
        secondary: theme.secondaryColor,
        accent: theme.badgeBackground,
        border: theme.primaryColor,
    },
    {
        id: 'scheme3',
        name: 'Dark',
        background: theme.footerBackground,
        foreground: '#ffffff',
        primary: theme.accentColor,
        secondary: theme.secondaryColor,
        accent: theme.primaryColor,
        border: theme.dividerColor,
    },
];

const createDefaultBlocks = (
    sectionId: string,
    kind: StorefrontSectionKind,
): StorefrontEditorBlock[] => {
    const registryItem = storefrontSectionRegistry[kind];
    return (registryItem.defaultBlocks || []).map((block, index) => {
        const blockRegistryItem = storefrontBlockRegistry[block.kind];
        return {
            id: `${sectionId}-${block.kind}-${index + 1}`,
            kind: block.kind,
            label: block.label || blockRegistryItem.label,
            enabled: true,
            order: index,
            settings: {
                ...blockRegistryItem.defaultSettings,
                ...toRecord(block.settings),
            },
            metadata: {
                generatedBy: 'system',
                userModified: false,
            },
        };
    });
};

const createEditorSection = (
    kind: StorefrontSectionKind,
    index: number,
    options: {
        id?: string;
        group?: StorefrontEditorGroup;
        settings?: Record<string, unknown>;
        enabled?: boolean;
        blocks?: StorefrontEditorBlock[];
        metadata?: StorefrontEditorSection['metadata'];
    } = {},
): StorefrontEditorSection => {
    const registryItem = storefrontSectionRegistry[kind];
    const id = options.id || `storefront-${kind}-${index + 1}`;
    const defaultEnabled = registryItem.defaultVisible !== false;
    const enabled = options.enabled ?? defaultEnabled;

    return {
        id,
        kind,
        label: getSectionLabel(kind),
        group: options.group || registryItem.group || 'template',
        enabled,
        order: index,
        settings: {
            ...registryItem.defaultSettings,
            ...toRecord(options.settings),
            enabled,
        },
        blocks: options.blocks || createDefaultBlocks(id, kind),
        metadata: {
            generatedBy: 'system',
            userModified: false,
            ...options.metadata,
        },
    };
};

const normalizeEditorSectionOrders = (sections: StorefrontEditorSection[]): StorefrontEditorSection[] => {
    let nextOrder = 0;
    return GROUP_ORDER.flatMap(group => (
        sections
            .filter(section => section.group === group)
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(section => ({
                ...section,
                order: nextOrder++,
                blocks: section.blocks
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((block, blockIndex) => ({ ...block, order: blockIndex })),
            }))
    ));
};

const normalizeInitialEditorSections = (
    project: any,
    pageData: Record<string, any>,
    editorSections: StorefrontEditorSection[],
    componentOrder: StorefrontSectionKind[],
    sectionVisibility: Record<string, boolean>,
    sectionSettings: Record<string, Record<string, unknown>>,
): StorefrontEditorSection[] => {
    if (editorSections.length > 0) {
        return normalizeEditorSectionOrders(editorSections.map((section, index) => ({
            ...section,
            label: section.label || getSectionLabel(section.kind),
            group: section.group || storefrontSectionRegistry[section.kind].group || 'template',
            order: Number.isFinite(section.order) ? section.order : index,
            settings: {
                ...storefrontSectionRegistry[section.kind].defaultSettings,
                ...toRecord(section.settings),
                enabled: section.enabled !== false,
            },
            blocks: section.blocks.length > 0 ? section.blocks : createDefaultBlocks(section.id, section.kind),
        })));
    }

    const legacyOrder = componentOrder.length > 0 ? componentOrder : fallbackSectionKinds;
    const augmentedOrder = [
        ...legacyOrder,
        ...(['storeFooter', 'policiesAndLinks', 'newsletterPopup', 'cartDrawer'] as StorefrontSectionKind[])
            .filter(kind => !legacyOrder.includes(kind)),
    ].filter((kind, index, array) => array.indexOf(kind) === index && STOREFRONT_SECTION_KINDS.includes(kind));

    return normalizeEditorSectionOrders(augmentedOrder.map((kind, index) => {
        const blueprintSection = findBlueprintSection(project, pageData, kind);
        const settings = {
            ...toRecord(pageData[kind]),
            ...toRecord(sectionSettings[kind]),
            ...toRecord(blueprintSection?.settings),
        };
        const isOverlay = storefrontSectionRegistry[kind].group === 'overlay';
        const enabled = sectionVisibility[kind] !== false && settings.enabled !== false && !isOverlay;

        return createEditorSection(kind, index, {
            id: blueprintSection?.id || `storefront-${kind}`,
            settings,
            enabled,
            metadata: isRecord(blueprintSection?.metadata) ? blueprintSection?.metadata : undefined,
        });
    }));
};

const buildSectionSettingsMap = (sections: StorefrontEditorSection[]): Record<string, Record<string, unknown>> =>
    sections.reduce((acc, section) => {
        acc[section.kind] = {
            ...toRecord(acc[section.kind]),
            ...section.settings,
            enabled: section.enabled,
            blocks: section.blocks,
        };
        return acc;
    }, {} as Record<string, Record<string, unknown>>);

const buildSectionVisibility = (sections: StorefrontEditorSection[]): Record<string, boolean> =>
    sections.reduce((acc, section) => {
        acc[section.kind] = section.enabled !== false;
        return acc;
    }, {} as Record<string, boolean>);

const buildStorefrontEditorSnapshot = (
    sections: StorefrontEditorSection[],
    presetId: StorefrontThemePresetId,
    themeSettings: StorefrontThemeSettings,
    colorSchemes: StorefrontEditorColorScheme[],
    activeColorScheme: string,
    now: string,
    state: TemplateState,
): StorefrontEditorSnapshot => {
    const normalizedSections = normalizeEditorSectionOrders(sections);
    return {
        id: 'storefront-home',
        pageType: 'home',
        componentOrder: normalizedSections.map(section => section.kind),
        sectionVisibility: buildSectionVisibility(normalizedSections),
        sectionSettings: buildSectionSettingsMap(normalizedSections),
        sections: normalizedSections,
        themePreset: presetId,
        themePresetId: presetId,
        themeSettings,
        theme: {
            presetId,
            themeSettings,
            activeColorScheme,
            colorSchemes,
        },
        state,
        updatedAt: now,
        ...(state === 'published' ? { publishedAt: now } : {}),
    };
};

const buildStorefrontBlueprintSections = (
    sections: StorefrontEditorSection[],
    existingSections: unknown,
    now: string,
    userId?: string,
): Array<Record<string, unknown>> => {
    const existing = Array.isArray(existingSections) ? existingSections : [];

    return normalizeEditorSectionOrders(sections).map(section => {
        const existingSection = existing.find((item: any) => item?.id === section.id || item?.type === section.kind) as Record<string, any> | undefined;
        return {
            ...existingSection,
            id: section.id,
            type: section.kind,
            order: section.order,
            enabled: section.enabled !== false,
            status: section.enabled === false ? 'disabled' : 'configured',
            needsReview: false,
            readiness: existingSection?.readiness || { isReady: true, blockers: [], warnings: [] },
            metadata: {
                ...(isRecord(existingSection?.metadata) ? existingSection?.metadata : {}),
                generatedBy: section.metadata?.generatedBy || existingSection?.metadata?.generatedBy || 'user',
                userModified: true,
                lastEditedAt: now,
                ...(userId ? { lastEditedBy: userId } : {}),
            },
            settings: section.settings,
            blocks: section.blocks,
        };
    });
};

const updateBusinessBlueprintStorefrontSections = (
    blueprint: unknown,
    sections: StorefrontEditorSection[],
    presetId: StorefrontThemePresetId,
    catalogSize: string,
    templateState: TemplateState,
    now: string,
    userId?: string,
): Record<string, unknown> | undefined => {
    if (!isRecord(blueprint) || !isRecord(blueprint.storefrontBlueprint)) return undefined;

    const storefrontBlueprint = blueprint.storefrontBlueprint as Record<string, any>;
    return {
        ...blueprint,
        lastSyncedAt: now,
        storefrontBlueprint: {
            ...storefrontBlueprint,
            enabled: true,
            status: templateState === 'published' ? 'published' : 'configured',
            needsReview: false,
            themePreset: presetId,
            catalogSize,
            sections: buildStorefrontBlueprintSections(sections, storefrontBlueprint.sections, now, userId),
            metadata: {
                ...(isRecord(storefrontBlueprint.metadata) ? storefrontBlueprint.metadata : {}),
                generatedBy: storefrontBlueprint.metadata?.generatedBy || 'user',
                userModified: true,
                lastEditedAt: now,
                ...(userId ? { lastEditedBy: userId } : {}),
            },
        },
    };
};

const StorefrontEditorView: React.FC = () => {
    const { user } = useAuth();
    const { storeId, projectId, projectName } = useEcommerceContext();
    const { projects, activeProject, refreshProjects } = useProject();
    const { products } = useProducts(user?.id || '', storeId);
    const {
        settings,
        isSaving: settingsSaving,
        getStorefrontTheme,
    } = useStoreSettings(user?.id || '', storeId);

    const project = useMemo(() => (
        projects.find(item => item.id === projectId) ||
        (activeProject?.id === projectId ? activeProject : null)
    ), [activeProject, projectId, projects]);

    const projectSignature = stableStringify({
        id: project?.id,
        data: project?.data,
        businessBlueprint: project?.businessBlueprint,
        componentOrder: project?.componentOrder,
        sectionVisibility: project?.sectionVisibility,
        updatedAt: project?.updatedAt || project?.lastUpdated || (project as any)?.last_updated,
    });

    const pageData = useMemo(() => getProjectPageData(project), [projectSignature]);
    const editorState = useMemo(() => toRecord(pageData.storefrontEditor), [pageData]);
    const draftEditorConfig = useMemo(
        () => resolveStorefrontEditorConfig(project, { mode: 'draft' }),
        [projectSignature],
    );
    const initialEditorSections = useMemo(() => normalizeInitialEditorSections(
        project,
        pageData,
        draftEditorConfig.sections,
        draftEditorConfig.componentOrder,
        draftEditorConfig.sectionVisibility,
        draftEditorConfig.sectionSettings,
    ), [draftEditorConfig, pageData, project, projectSignature]);

    const [editorSections, setEditorSections] = useState<StorefrontEditorSection[]>(initialEditorSections);
    const [selectedNode, setSelectedNode] = useState<SelectedStorefrontNode>(() => ({
        nodeType: 'section',
        id: initialEditorSections[0]?.id,
    }));
    const [templateState, setTemplateState] = useState<TemplateState>(
        editorState.templateState === 'published' ? 'published' : 'draft',
    );
    const [previewMode, setPreviewMode] = useState<StorefrontEditorPreviewMode>('desktop');
    const [selectedPresetId, setSelectedPresetId] = useState<StorefrontThemePresetId>(
        (draftEditorConfig.themePresetId as StorefrontThemePresetId) ||
        (editorState.themePresetId as StorefrontThemePresetId) ||
        'minimal',
    );
    const [activeColorScheme, setActiveColorScheme] = useState<string>(
        String(draftEditorConfig.theme?.activeColorScheme || 'scheme1'),
    );
    const [previewRevision, setPreviewRevision] = useState(0);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const previewPayloadRef = useRef('');

    useEffect(() => {
        setEditorSections(initialEditorSections);
        setSelectedNode(prev => {
            if (prev.id && initialEditorSections.some(section => section.id === prev.id || section.blocks.some(block => block.id === prev.id))) {
                return prev;
            }
            return { nodeType: 'section', id: initialEditorSections[0]?.id };
        });
        setTemplateState(editorState.templateState === 'published' ? 'published' : 'draft');
        setSelectedPresetId(
            (draftEditorConfig.themePresetId as StorefrontThemePresetId) ||
            (editorState.themePresetId as StorefrontThemePresetId) ||
            'minimal',
        );
        setActiveColorScheme(String(draftEditorConfig.theme?.activeColorScheme || 'scheme1'));
    }, [draftEditorConfig, editorState.templateState, editorState.themePresetId, initialEditorSections]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (!isRecord(event.data) || event.data.type !== 'quimera:storefront-editor:select') return;
            const nodeType = event.data.nodeType === 'block' ? 'block' : 'section';
            setSelectedNode({
                nodeType,
                id: typeof event.data.id === 'string' ? event.data.id : undefined,
                parentId: typeof event.data.parentId === 'string' ? event.data.parentId : undefined,
            });
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const currentTheme = getStorefrontTheme();
    const currentThemeSignature = stableStringify(currentTheme);
    const previewStorefrontTheme = useMemo(
        () => mergeTheme(currentTheme, selectedPresetId),
        [currentThemeSignature, selectedPresetId],
    );
    const colorSchemes = useMemo(
        () => buildColorSchemes(previewStorefrontTheme),
        [previewStorefrontTheme],
    );
    const catalogSize = getStorefrontCatalogSize(products.length);
    const normalizedEditorSections = useMemo(
        () => normalizeEditorSectionOrders(editorSections),
        [editorSections],
    );
    const selectedSection = useMemo(() => {
        if (selectedNode.nodeType === 'block') {
            return normalizedEditorSections.find(section => section.id === selectedNode.parentId);
        }
        return normalizedEditorSections.find(section => section.id === selectedNode.id);
    }, [normalizedEditorSections, selectedNode]);
    const selectedBlock = useMemo(() => {
        if (selectedNode.nodeType !== 'block') return undefined;
        return selectedSection?.blocks.find(block => block.id === selectedNode.id);
    }, [selectedNode, selectedSection]);
    const storefrontUrl = `/store/${storeId}`;
    const previewSessionKey = `${STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX}${storeId}`;
    const selectedSectionId = selectedNode.nodeType === 'section' ? selectedNode.id || '' : selectedNode.parentId || '';
    const selectedBlockId = selectedNode.nodeType === 'block' ? selectedNode.id || '' : '';
    const previewUrl = `${storefrontUrl}?preview=storefront-editor&editorSession=${encodeURIComponent(previewSessionKey)}&previewRevision=${previewRevision}&selectedSectionId=${encodeURIComponent(selectedSectionId)}&selectedBlockId=${encodeURIComponent(selectedBlockId)}`;
    const previewDisplayName = settings?.storeName || projectName || project?.name || 'Tienda';
    const isBusy = isSavingTemplate || settingsSaving;

    const previewProjectData = useMemo(() => {
        const now = String(editorState.updatedAt || project?.lastUpdated || (project as any)?.last_updated || 'storefront-preview');
        const nextSectionSettings = buildSectionSettingsMap(normalizedEditorSections);
        const nextSectionVisibility = buildSectionVisibility(normalizedEditorSections);
        const nextComponentOrder = [
            ...(project?.componentOrder || []).filter((section: string) => !isStorefrontSectionKind(section)),
            ...normalizedEditorSections.map(section => section.kind),
        ];
        const existingBusinessBlueprint = getProjectBusinessBlueprint(project, pageData);
        const previewBusinessBlueprint = updateBusinessBlueprintStorefrontSections(
            existingBusinessBlueprint,
            normalizedEditorSections,
            selectedPresetId,
            catalogSize,
            templateState,
            now,
            user?.id,
        ) || existingBusinessBlueprint;
        const draftSnapshot = buildStorefrontEditorSnapshot(
            normalizedEditorSections,
            selectedPresetId,
            previewStorefrontTheme,
            colorSchemes,
            activeColorScheme,
            now,
            'draft',
        );
        const previewStorefrontEditor = {
            ...editorState,
            templateState,
            themePreset: selectedPresetId,
            themePresetId: selectedPresetId,
            previewMode,
            selectedNode,
            sectionSettings: nextSectionSettings,
            draft: draftSnapshot,
            source: 'storefront-builder-preview',
            updatedAt: now,
        };
        const nextPageData = normalizedEditorSections.reduce((acc, section) => {
            acc[section.kind] = {
                ...section.settings,
                blocks: section.blocks,
            };
            return acc;
        }, {
            ...pageData,
            ...(previewBusinessBlueprint ? { businessBlueprint: previewBusinessBlueprint } : {}),
            storefrontEditor: previewStorefrontEditor,
            storefrontResolvedSections: normalizedEditorSections,
        } as Record<string, any>);

        return {
            ...project,
            id: projectId,
            name: previewDisplayName,
            header: buildPreviewHeader(project, pageData, previewStorefrontTheme),
            theme: buildPreviewTheme(project, previewStorefrontTheme),
            storefrontTheme: previewStorefrontTheme,
            data: nextPageData,
            componentOrder: nextComponentOrder,
            sectionVisibility: nextSectionVisibility,
            ...(previewBusinessBlueprint ? { businessBlueprint: previewBusinessBlueprint } : {}),
        };
    }, [
        activeColorScheme,
        catalogSize,
        colorSchemes,
        editorState,
        normalizedEditorSections,
        pageData,
        previewDisplayName,
        previewMode,
        previewStorefrontTheme,
        project,
        projectId,
        selectedNode,
        selectedPresetId,
        templateState,
        user?.id,
    ]);

    useEffect(() => {
        if (!storeId || !project) return;

        try {
            const nextPayload = JSON.stringify(previewProjectData);
            if (nextPayload === previewPayloadRef.current) return;
            previewPayloadRef.current = nextPayload;
            window.sessionStorage.setItem(previewSessionKey, nextPayload);
        } catch (err) {
            console.warn('Unable to prepare storefront editor preview data:', err);
        }
    }, [previewProjectData, previewSessionKey, project, storeId]);

    const markDirty = useCallback(() => {
        setTemplateState('draft');
    }, []);

    const updateEditorSections = useCallback((updater: (sections: StorefrontEditorSection[]) => StorefrontEditorSection[]) => {
        setEditorSections(prev => normalizeEditorSectionOrders(updater(prev)));
        markDirty();
    }, [markDirty]);

    const updateSectionSetting = (sectionId: string, key: string, value: unknown) => {
        updateEditorSections(sections => sections.map(section => {
            if (section.id !== sectionId) return section;
            const enabled = key === 'enabled' ? Boolean(value) : section.enabled;
            return {
                ...section,
                enabled,
                settings: {
                    ...section.settings,
                    [key]: value,
                    ...(key === 'enabled' ? { enabled } : {}),
                },
                metadata: {
                    ...section.metadata,
                    userModified: true,
                    lastEditedAt: new Date().toISOString(),
                    ...(user?.id ? { lastEditedBy: user.id } : {}),
                },
            };
        }));
    };

    const updateBlockSetting = (sectionId: string, blockId: string, key: string, value: unknown) => {
        updateEditorSections(sections => sections.map(section => {
            if (section.id !== sectionId) return section;
            return {
                ...section,
                blocks: section.blocks.map(block => {
                    if (block.id !== blockId) return block;
                    const enabled = key === 'enabled' ? Boolean(value) : block.enabled;
                    return {
                        ...block,
                        enabled,
                        settings: {
                            ...block.settings,
                            [key]: value,
                            ...(key === 'enabled' ? { enabled } : {}),
                        },
                        metadata: {
                            ...block.metadata,
                            userModified: true,
                            lastEditedAt: new Date().toISOString(),
                            ...(user?.id ? { lastEditedBy: user.id } : {}),
                        },
                    };
                }),
            };
        }));
    };

    const resetSectionSettings = (sectionId: string) => {
        updateEditorSections(sections => sections.map(section => {
            if (section.id !== sectionId) return section;
            const registryItem = storefrontSectionRegistry[section.kind];
            return {
                ...section,
                enabled: registryItem.defaultVisible !== false,
                settings: {
                    ...registryItem.defaultSettings,
                    enabled: registryItem.defaultVisible !== false,
                },
            };
        }));
    };

    const toggleSection = (sectionId: string, enabled: boolean) => {
        updateSectionSetting(sectionId, 'enabled', enabled);
    };

    const moveSection = (sectionId: string, direction: -1 | 1) => {
        updateEditorSections(sections => {
            const target = sections.find(section => section.id === sectionId);
            if (!target) return sections;
            const groupSections = sections
                .filter(section => section.group === target.group)
                .slice()
                .sort((a, b) => a.order - b.order);
            const index = groupSections.findIndex(section => section.id === sectionId);
            const nextIndex = index + direction;
            if (index < 0 || nextIndex < 0 || nextIndex >= groupSections.length) return sections;
            [groupSections[index], groupSections[nextIndex]] = [groupSections[nextIndex], groupSections[index]];
            const groupIds = new Set(groupSections.map(section => section.id));
            return [
                ...sections.filter(section => !groupIds.has(section.id)),
                ...groupSections,
            ];
        });
    };

    const removeSection = (sectionId: string) => {
        updateEditorSections(sections => sections.filter(section => section.id !== sectionId));
        setSelectedNode(prev => prev.id === sectionId || prev.parentId === sectionId
            ? { nodeType: 'section', id: normalizedEditorSections.find(section => section.id !== sectionId)?.id }
            : prev);
    };

    const addSection = (kind: StorefrontSectionKind, group?: StorefrontEditorGroup) => {
        const section = createEditorSection(kind, normalizedEditorSections.length, {
            id: `storefront-${kind}-${Date.now().toString(36)}`,
            group: group || storefrontSectionRegistry[kind].group,
            enabled: true,
            settings: { enabled: true },
            metadata: {
                generatedBy: 'user',
                userModified: true,
                lastEditedAt: new Date().toISOString(),
                ...(user?.id ? { lastEditedBy: user.id } : {}),
            },
        });
        updateEditorSections(sections => [...sections, section]);
        setSelectedNode({ nodeType: 'section', id: section.id });
    };

    const toggleBlock = (sectionId: string, blockId: string, enabled: boolean) => {
        updateBlockSetting(sectionId, blockId, 'enabled', enabled);
    };

    const removeBlock = (sectionId: string, blockId: string) => {
        updateEditorSections(sections => sections.map(section => (
            section.id === sectionId
                ? { ...section, blocks: section.blocks.filter(block => block.id !== blockId) }
                : section
        )));
        setSelectedNode(prev => prev.id === blockId ? { nodeType: 'section', id: sectionId } : prev);
    };

    const addBlock = (sectionId: string, kind: StorefrontEditorBlockKind) => {
        const blockRegistryItem = storefrontBlockRegistry[kind];
        const block: StorefrontEditorBlock = {
            id: `${sectionId}-${kind}-${Date.now().toString(36)}`,
            kind,
            label: blockRegistryItem.label,
            enabled: true,
            order: 0,
            settings: { ...blockRegistryItem.defaultSettings, enabled: true },
            metadata: {
                generatedBy: 'user',
                userModified: true,
                lastEditedAt: new Date().toISOString(),
                ...(user?.id ? { lastEditedBy: user.id } : {}),
            },
        };
        updateEditorSections(sections => sections.map(section => (
            section.id === sectionId
                ? { ...section, blocks: [...section.blocks, { ...block, order: section.blocks.length }] }
                : section
        )));
        setSelectedNode({ nodeType: 'block', id: block.id, parentId: sectionId });
    };

    const applyThemePreset = (presetId: StorefrontThemePresetId) => {
        const preset = STOREFRONT_THEME_PRESETS[presetId];
        setSelectedPresetId(presetId);
        setActiveColorScheme('scheme1');
        updateEditorSections(sections => {
            const recommended = preset.recommendedSections
                .filter(isStorefrontSectionKind)
                .filter(kind => !sections.some(section => section.kind === kind))
                .map((kind, index) => createEditorSection(kind, sections.length + index, {
                    enabled: true,
                    metadata: {
                        generatedBy: 'system',
                        userModified: false,
                    },
                }));
            return sections.map(section => (
                preset.recommendedSections.includes(section.kind as any)
                    ? { ...section, enabled: true, settings: { ...section.settings, enabled: true } }
                    : section
            )).concat(recommended);
        });
        setStatusMessage('Preset aplicado al draft del storefront.');
    };

    const saveTemplate = async (nextState: TemplateState = templateState) => {
        if (!projectId || !project) return;

        setIsSavingTemplate(true);
        setError(null);
        setStatusMessage(null);

        try {
            const invalidSections = normalizedEditorSections
                .map(section => ({
                    section,
                    validation: validateStorefrontSectionSettings(section.kind, section.settings),
                }))
                .filter(result => !result.validation.valid);

            if (invalidSections.length > 0) {
                throw new Error(invalidSections
                    .map(result => `${result.section.label}: ${result.validation.errors.join(', ')}`)
                    .join(' | '));
            }

            const { data: row, error: readError } = await supabase
                .from('projects')
                .select('data, component_order, section_visibility')
                .eq('id', projectId)
                .maybeSingle();
            if (readError) throw readError;

            const now = new Date().toISOString();
            const currentComponentOrder = Array.isArray(row?.component_order)
                ? row.component_order as string[]
                : project.componentOrder || [];
            const currentVisibility = isRecord(row?.section_visibility)
                ? row.section_visibility as Record<string, boolean>
                : project.sectionVisibility || {};
            const dataPayload = isRecord(row?.data) ? row.data : {};
            const hasNestedPageData = isRecord(dataPayload.data);
            const currentPageData = hasNestedPageData ? dataPayload.data : dataPayload;
            const nextSectionSettings = buildSectionSettingsMap(normalizedEditorSections);
            const nextSectionVisibility = {
                ...currentVisibility,
                ...buildSectionVisibility(normalizedEditorSections),
            };
            const nextComponentOrder = [
                ...currentComponentOrder.filter(section => !isStorefrontSectionKind(section)),
                ...normalizedEditorSections.map(section => section.kind),
            ] as PageSection[];
            const currentBusinessBlueprint = isRecord(dataPayload.businessBlueprint)
                ? dataPayload.businessBlueprint
                : currentPageData.businessBlueprint;
            const nextBusinessBlueprint = updateBusinessBlueprintStorefrontSections(
                currentBusinessBlueprint,
                normalizedEditorSections,
                selectedPresetId,
                catalogSize,
                nextState,
                now,
                user?.id,
            );
            const existingStorefrontEditor = isRecord(currentPageData.storefrontEditor)
                ? currentPageData.storefrontEditor
                : {};
            const draftSnapshot = buildStorefrontEditorSnapshot(
                normalizedEditorSections,
                selectedPresetId,
                previewStorefrontTheme,
                colorSchemes,
                activeColorScheme,
                now,
                'draft',
            );
            const publishedSnapshot = nextState === 'published'
                ? buildStorefrontEditorSnapshot(
                    normalizedEditorSections,
                    selectedPresetId,
                    previewStorefrontTheme,
                    colorSchemes,
                    activeColorScheme,
                    now,
                    'published',
                )
                : (isRecord(existingStorefrontEditor.published) ? existingStorefrontEditor.published : undefined);
            const nextStorefrontEditor = {
                ...existingStorefrontEditor,
                templateState: nextState,
                themePreset: selectedPresetId,
                themePresetId: selectedPresetId,
                previewMode,
                sectionSettings: nextSectionSettings,
                draft: draftSnapshot,
                ...(publishedSnapshot ? { published: publishedSnapshot } : {}),
                updatedAt: now,
                source: 'storefront-builder',
            };
            const nextPageData = normalizedEditorSections.reduce((acc, section) => {
                acc[section.kind] = {
                    ...section.settings,
                    blocks: section.blocks,
                };
                return acc;
            }, {
                ...currentPageData,
                ...(nextBusinessBlueprint && !hasNestedPageData ? { businessBlueprint: nextBusinessBlueprint } : {}),
                storefrontEditor: nextStorefrontEditor,
                storefrontResolvedSections: normalizedEditorSections,
            } as Record<string, any>);
            const nextDataPayload = hasNestedPageData
                ? {
                    ...dataPayload,
                    ...(nextBusinessBlueprint ? { businessBlueprint: nextBusinessBlueprint } : {}),
                    data: nextPageData,
                    componentOrder: nextComponentOrder,
                    sectionVisibility: nextSectionVisibility,
                    lastUpdated: now,
                }
                : {
                    ...nextPageData,
                    componentOrder: nextComponentOrder,
                    sectionVisibility: nextSectionVisibility,
                    lastUpdated: now,
                };

            const { error: updateError } = await supabase
                .from('projects')
                .update({
                    data: nextDataPayload,
                    component_order: nextComponentOrder,
                    section_visibility: nextSectionVisibility,
                    last_updated: now,
                })
                .eq('id', projectId);
            if (updateError) throw updateError;

            if (nextState === 'published' && storeId) {
                const { data: publicStoreRow, error: publicReadError } = await supabase
                    .from('public_stores')
                    .select('data, user_id')
                    .eq('id', storeId)
                    .maybeSingle();

                if (publicReadError) throw publicReadError;

                const existingPublicData = isRecord(publicStoreRow?.data) ? publicStoreRow.data : {};
                const publicStoreData = {
                    ...existingPublicData,
                    id: storeId,
                    projectId,
                    sourceProjectId: projectId,
                    name: previewDisplayName,
                    data: nextPageData,
                    header: buildPreviewHeader(project, nextPageData, previewStorefrontTheme),
                    theme: buildPreviewTheme(project, previewStorefrontTheme),
                    storefrontTheme: previewStorefrontTheme,
                    businessBlueprint: nextBusinessBlueprint || currentBusinessBlueprint,
                    storefrontEditor: nextStorefrontEditor,
                    componentOrder: nextComponentOrder,
                    sectionVisibility: nextSectionVisibility,
                    pages: project.pages || [],
                    menus: project.menus || [],
                    publishedAt: now,
                    updatedAt: now,
                };

                const { error: publicUpsertError } = await supabase
                    .from('public_stores')
                    .upsert({
                        id: storeId,
                        user_id: publicStoreRow?.user_id || user?.id || project.userId || (project as any).user_id,
                        data: publicStoreData,
                    });

                if (publicUpsertError) throw publicUpsertError;
            }

            setTemplateState(nextState);
            await refreshProjects();
            setStatusMessage(nextState === 'published'
                ? 'Storefront publicado.'
                : 'Draft guardado.');
        } catch (err: any) {
            setError(err.message || 'No se pudo guardar el storefront.');
        } finally {
            setIsSavingTemplate(false);
        }
    };

    if (!projectId || !project) {
        return (
            <div className="rounded-lg border border-q-border bg-q-surface p-6 text-sm text-q-text-muted">
                Selecciona un proyecto para editar su storefront.
            </div>
        );
    }

    return (
        <StorefrontThemeEditorShell
            topbar={(
                <StorefrontEditorTopbar
                    storeName={previewDisplayName}
                    pageLabel="Home page"
                    templateState={templateState}
                    previewMode={previewMode}
                    storefrontUrl={storefrontUrl}
                    isBusy={isBusy}
                    onPreviewModeChange={setPreviewMode}
                    onRefreshPreview={() => setPreviewRevision(prev => prev + 1)}
                    onSaveDraft={() => saveTemplate('draft')}
                    onPublish={() => saveTemplate('published')}
                />
            )}
            statusBar={<StorefrontEditorStatusBar message={statusMessage} error={error} />}
            leftPanel={(
                <>
                    <StorefrontEditorNavigator pageLabel="Home page" />
                    <StorefrontEditorSectionTree
                        sections={normalizedEditorSections}
                        selectedNode={selectedNode}
                        onSelect={setSelectedNode}
                        onToggleSection={toggleSection}
                        onMoveSection={moveSection}
                        onRemoveSection={removeSection}
                        onAddSection={addSection}
                        onToggleBlock={toggleBlock}
                        onRemoveBlock={removeBlock}
                        onAddBlock={addBlock}
                    />
                </>
            )}
            canvas={(
                <StorefrontEditorCanvas
                    previewUrl={previewUrl}
                    previewMode={previewMode}
                    displayUrl={`https://quimera.ai/${String(previewDisplayName).toLowerCase().replace(/\s+/g, '-')}`}
                />
            )}
            inspector={(
                <StorefrontEditorInspector
                    selectedNode={selectedNode.nodeType === 'section' || selectedNode.nodeType === 'block' ? selectedNode : selectedNode}
                    selectedSection={selectedSection}
                    selectedBlock={selectedBlock}
                    templateState={templateState}
                    colorSchemes={colorSchemes}
                    activeColorScheme={activeColorScheme}
                    selectedPresetId={selectedPresetId}
                    themeSettings={previewStorefrontTheme}
                    onTemplateStateChange={setTemplateState}
                    onSectionSettingChange={updateSectionSetting}
                    onBlockSettingChange={updateBlockSetting}
                    onSectionReset={resetSectionSettings}
                    onThemePresetChange={applyThemePreset}
                    onThemeSchemeChange={(schemeId) => {
                        setActiveColorScheme(schemeId);
                        markDirty();
                    }}
                />
            )}
        />
    );
};

export default StorefrontEditorView;
