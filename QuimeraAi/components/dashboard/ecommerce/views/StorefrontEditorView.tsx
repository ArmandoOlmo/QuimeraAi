/**
 * StorefrontEditorView
 * Presentation-only storefront editor shell for ecommerce projects.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCenter,
    type DragEndEvent,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    AlertCircle,
    AlignHorizontalJustifyCenter,
    Box,
    ChevronDown,
    CheckCircle2,
    Clock,
    Columns3,
    ExternalLink,
    Eye,
    EyeOff,
    FileText,
    GripVertical,
    Image as ImageIcon,
    LayoutTemplate,
    Maximize2,
    Loader2,
    Monitor,
    Palette,
    PanelRightClose,
    PanelRightOpen,
    Plus,
    RefreshCw,
    Save,
    Settings,
    SlidersHorizontal,
    Sparkles,
    Smartphone,
    Tablet,
    Trash2,
    Type,
} from 'lucide-react';
import { supabase } from '../../../../supabase';
import { useAuth } from '../../../../contexts/core/AuthContext';
import { useProject } from '../../../../contexts/project';
import type { PageSection } from '../../../../types';
import { DEFAULT_STOREFRONT_THEME, type StorefrontThemeSettings } from '../../../../types/ecommerce';
import type { StorefrontSectionKind } from '../../../../types/storefrontRenderer';
import type { StorefrontThemePresetId } from '../../../../types/storefrontTheme';
import ColorControl from '../../../ui/ColorControl';
import TabbedControls from '../../../ui/TabbedControls';
import {
    BorderRadiusSelector,
    FontSizeSelector,
    PaddingSelector,
    Select,
    SliderControl,
    ToggleControl,
} from '../../../ui/EditorControlPrimitives';
import {
    BackgroundImageControl,
    CornerGradientControl,
} from '../../../controls/ControlsShared';
import {
    normalizeStorefrontSectionVisibility,
    resolveStorefrontEditorConfig,
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

type PreviewMode = 'desktop' | 'tablet' | 'mobile';
type TemplateState = 'draft' | 'published';
type SectionSettingsMap = Partial<Record<StorefrontSectionKind, Record<string, unknown>>>;
type StorefrontStructurePanel = 'template' | 'theme';
type StorefrontThemeWithPresetMetadata = StorefrontThemeSettings & {
    themePreset?: StorefrontThemePresetId;
    themePresetId?: StorefrontThemePresetId;
    presetId?: StorefrontThemePresetId;
};

const defaultSections: StorefrontSectionKind[] = [...STOREFRONT_SECTION_KINDS];

const previewWidths: Record<PreviewMode, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
};

const MIN_PREVIEW_FRAME_HEIGHT = 760;
const STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX = 'quimera:storefront-editor-preview:';
const STOREFRONT_EDITOR_PREVIEW_UPDATE = 'quimera:storefront-editor-preview:update';

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isStorefrontKind = (value: string): value is StorefrontSectionKind =>
    STOREFRONT_SECTION_KINDS.includes(value as StorefrontSectionKind);

const isThemePresetId = (value: unknown): value is StorefrontThemePresetId =>
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(STOREFRONT_THEME_PRESETS, value);

const normalizeThemePresetId = (value: unknown): StorefrontThemePresetId | undefined =>
    isThemePresetId(value) ? value : undefined;

const getThemePresetIdFromTheme = (theme?: Partial<StorefrontThemeWithPresetMetadata> | null): StorefrontThemePresetId | undefined =>
    normalizeThemePresetId(theme?.themePresetId) ||
    normalizeThemePresetId(theme?.themePreset) ||
    normalizeThemePresetId(theme?.presetId);

const toSettingsRecord = (value: unknown): Record<string, unknown> =>
    isRecord(value) ? { ...value } : {};

const storefrontDefaultVisibilityBySection = STOREFRONT_SECTION_KINDS.reduce((acc, section) => {
    acc[section] = storefrontSectionRegistry[section].defaultVisible ?? true;
    return acc;
}, {} as Record<string, boolean>);

const stableStringify = (value: unknown): string => {
    try {
        return JSON.stringify(value ?? null);
    } catch {
        return String(value ?? '');
    }
};

const areArraysEqual = <T,>(left: T[], right: T[]): boolean =>
    left.length === right.length && left.every((item, index) => item === right[index]);

const getProjectPageData = (project: any): Record<string, any> => {
    const dataPayload = isRecord(project?.data) ? project.data : {};
    return isRecord(dataPayload.data) ? dataPayload.data : dataPayload;
};

const getProjectBusinessBlueprint = (project: any, pageData?: Record<string, any>): Record<string, any> | undefined => {
    const dataPayload = isRecord(project?.data) ? project.data : {};
    const candidates = [
        project?.businessBlueprint,
        dataPayload.businessBlueprint,
        isRecord(dataPayload.data) ? dataPayload.data.businessBlueprint : undefined,
        pageData?.businessBlueprint,
    ];

    return candidates.find(isRecord);
};

const getProjectHeaderData = (project: any, pageData: Record<string, any>): Record<string, any> => (
    toSettingsRecord(project?.header).colors
        ? toSettingsRecord(project?.header)
        : toSettingsRecord(pageData.header)
);

const findBlueprintSection = (project: any, pageData: Record<string, any>, kind: StorefrontSectionKind): Record<string, any> | undefined => {
    const sections = getProjectBusinessBlueprint(project, pageData)?.storefrontBlueprint?.sections;
    if (!Array.isArray(sections)) return undefined;
    return sections.find((section: any) => section?.type === kind && isRecord(section));
};

const buildSectionSettingsMap = (
    sections: StorefrontSectionKind[],
    pageData: Record<string, any>,
    editorState: Record<string, any>,
    project: any,
): SectionSettingsMap => {
    const editorSettings = toSettingsRecord(editorState.sectionSettings);

    return sections.reduce((acc, section) => {
        const blueprintSection = findBlueprintSection(project, pageData, section);
        acc[section] = {
            ...storefrontSectionRegistry[section].defaultSettings,
            ...toSettingsRecord(pageData[section]),
            ...toSettingsRecord(editorSettings[section]),
            ...toSettingsRecord(blueprintSection?.settings),
        };
        return acc;
    }, {} as SectionSettingsMap);
};

const compactSettings = (settings: Record<string, unknown>): Record<string, unknown> =>
    Object.entries(settings).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
    }, {} as Record<string, unknown>);

const normalizeSectionSettings = (
    sections: StorefrontSectionKind[],
    sectionSettings: SectionSettingsMap,
): SectionSettingsMap =>
    sections.reduce((acc, section) => {
        acc[section] = compactSettings({
            ...storefrontSectionRegistry[section].defaultSettings,
            ...toSettingsRecord(sectionSettings[section]),
        });
        return acc;
    }, {} as SectionSettingsMap);

const buildCurrentStorefrontVisibility = (
    sections: StorefrontSectionKind[],
    previousVisibility: Record<string, boolean>,
    options: {
        recommendedSections?: StorefrontSectionKind[];
        forceRecommendedVisible?: boolean;
        ensureAtLeastOneVisible?: boolean;
    } = {},
): Record<string, boolean> =>
    normalizeStorefrontSectionVisibility({
        sections,
        previousVisibility,
        recommendedSections: options.recommendedSections,
        forceRecommendedVisible: options.forceRecommendedVisible,
        defaultVisibleBySection: storefrontDefaultVisibilityBySection,
        ensureAtLeastOneVisible: options.ensureAtLeastOneVisible,
        fallbackSection: sections.includes('featuredProducts') ? 'featuredProducts' : sections[0],
    });

const buildStorefrontEditorSnapshot = (
    sections: StorefrontSectionKind[],
    sectionSettings: SectionSettingsMap,
    visibility: Record<string, boolean>,
    presetId: StorefrontThemePresetId,
    themeSettings: StorefrontThemeSettings,
    now: string,
    state: TemplateState,
): Record<string, unknown> => ({
    componentOrder: sections,
    sectionVisibility: sections.reduce((acc, section) => {
        acc[section] = visibility[section] !== false;
        return acc;
    }, {} as Record<string, boolean>),
    themePreset: presetId,
    themePresetId: presetId,
    themeSettings,
    sectionSettings,
    sections: sections.map((section, index) => ({
        id: `storefront-${section}`,
        type: section,
        order: index,
        enabled: visibility[section] !== false,
        settings: toSettingsRecord(sectionSettings[section]),
    })),
    state,
    updatedAt: now,
    ...(state === 'published' ? { publishedAt: now } : {}),
});

const parseCsv = (value: string): string[] =>
    value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

const toCsv = (value: unknown): string =>
    Array.isArray(value) ? value.map(item => String(item)).join(', ') : '';

const messagesToText = (value: unknown): string => {
    if (!Array.isArray(value)) return '';
    return value
        .map(item => (isRecord(item) ? String(item.text || '') : String(item)))
        .filter(Boolean)
        .join('\n');
};

const textToMessages = (value: string): Array<{ text: string }> =>
    value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(text => ({ text }));

const storefrontSelectOptions = {
    padding: [
        { value: 'none', label: '0' },
        { value: 'sm', label: 'SM' },
        { value: 'md', label: 'MD' },
        { value: 'lg', label: 'LG' },
        { value: 'xl', label: 'XL' },
    ],
    productCardStyle: [
        { value: 'overlay', label: 'Imagen completa' },
        { value: 'modern', label: 'Modern' },
        { value: 'elegant', label: 'Elegant' },
        { value: 'minimal', label: 'Minimal' },
        { value: 'luxury', label: 'Luxury' },
        { value: 'marketplace', label: 'Marketplace' },
        { value: 'editorial', label: 'Editorial' },
        { value: 'imageFirst', label: 'Image First' },
        { value: 'quickBuy', label: 'Quick Buy' },
        { value: 'compact', label: 'Compact' },
    ],
    cardGap: [
        { value: 'sm', label: 'Compacto' },
        { value: 'md', label: 'Normal' },
        { value: 'lg', label: 'Amplio' },
        { value: 'xl', label: 'Editorial' },
    ],
    aspectRatio: [
        { value: '1:1', label: '1:1' },
        { value: '4:3', label: '4:3' },
        { value: '3:4', label: '3:4' },
        { value: '4:5', label: '4:5' },
        { value: '16:9', label: '16:9' },
        { value: '9:16', label: '9:16' },
    ],
    objectFit: [
        { value: 'cover', label: 'Cover' },
        { value: 'contain', label: 'Contain' },
        { value: 'fill', label: 'Fill' },
    ],
    alignment: [
        { value: 'left', label: 'Izquierda' },
        { value: 'center', label: 'Centro' },
        { value: 'right', label: 'Derecha' },
    ],
    overlayStyle: [
        { value: 'gradient', label: 'Degradado' },
        { value: 'solid', label: 'Sólido' },
        { value: 'none', label: 'Sin overlay' },
    ],
    visibleIn: [
        { value: 'both', label: 'Landing + tienda' },
        { value: 'store', label: 'Tienda' },
        { value: 'landing', label: 'Landing' },
    ],
    sourceType: [
        { value: 'newest', label: 'Nuevos' },
        { value: 'on-sale', label: 'En oferta' },
        { value: 'category', label: 'Categoría' },
        { value: 'manual', label: 'Manual' },
    ],
};

const getNestedSetting = (settings: Record<string, unknown>, path: string): unknown =>
    path.split('.').reduce<unknown>((current, key) => (
        isRecord(current) ? current[key] : undefined
    ), settings);

const getSettingString = (settings: Record<string, unknown>, path: string, fallback = ''): string => {
    const value = getNestedSetting(settings, path);
    return typeof value === 'string' ? value : fallback;
};

const getSettingNumber = (settings: Record<string, unknown>, path: string, fallback: number): number => {
    const value = getNestedSetting(settings, path);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const getSettingBoolean = (settings: Record<string, unknown>, path: string, fallback: boolean): boolean => {
    const value = getNestedSetting(settings, path);
    return typeof value === 'boolean' ? value : fallback;
};

const buildStorefrontBlueprintSections = (
    sections: StorefrontSectionKind[],
    settings: SectionSettingsMap,
    visibility: Record<string, boolean>,
    existingSections: unknown,
    now: string,
    userId?: string,
): Array<Record<string, unknown>> => {
    const existing = Array.isArray(existingSections) ? existingSections : [];

    return sections.map((section, index) => {
        const existingSection = existing.find((item: any) => item?.type === section && isRecord(item)) as Record<string, any> | undefined;
        const sectionData = toSettingsRecord(settings[section]);
        const enabled = visibility[section] !== false && sectionData.enabled !== false;

        return {
            ...existingSection,
            id: existingSection?.id || `storefront-${section}`,
            type: section,
            order: index,
            enabled,
            status: enabled ? 'configured' : 'disabled',
            needsReview: false,
            readiness: existingSection?.readiness || { isReady: true, blockers: [], warnings: [] },
            metadata: {
                ...(isRecord(existingSection?.metadata) ? existingSection?.metadata : {}),
                generatedBy: existingSection?.metadata?.generatedBy || 'user',
                userModified: true,
                lastEditedAt: now,
                ...(userId ? { lastEditedBy: userId } : {}),
            },
            settings: sectionData,
        };
    });
};

const updateBusinessBlueprintStorefrontSections = (
    blueprint: unknown,
    sections: StorefrontSectionKind[],
    settings: SectionSettingsMap,
    visibility: Record<string, boolean>,
    presetId: StorefrontThemePresetId,
    catalogSize: string,
    templateState: TemplateState,
    now: string,
    userId?: string,
): Record<string, unknown> | undefined => {
    if (!isRecord(blueprint) || !isRecord(blueprint.storefrontBlueprint)) return undefined;

    const storefrontBlueprint = blueprint.storefrontBlueprint as Record<string, any>;
    const nextSections = buildStorefrontBlueprintSections(
        sections,
        settings,
        visibility,
        storefrontBlueprint.sections,
        now,
        userId,
    );

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
            sections: nextSections,
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

const mergeTheme = (
    currentTheme: StorefrontThemeSettings,
    presetId: StorefrontThemePresetId,
): StorefrontThemeWithPresetMetadata => ({
    ...DEFAULT_STOREFRONT_THEME,
    ...currentTheme,
    ...STOREFRONT_THEME_PRESETS[presetId].theme,
    themePreset: presetId,
    themePresetId: presetId,
    presetId,
});

const buildPreviewTheme = (project: any, storefrontTheme: StorefrontThemeSettings): Record<string, any> => ({
    ...toSettingsRecord(project?.theme),
    pageBackground: storefrontTheme.backgroundColor,
    globalColors: {
        ...toSettingsRecord(project?.theme?.globalColors),
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
            ...toSettingsRecord(header.colors),
            background: storefrontTheme.headerBackground,
            text: storefrontTheme.textColor,
            accent: storefrontTheme.primaryColor,
        },
    };
};

interface SortableStorefrontSectionItemProps {
    section: StorefrontSectionKind;
    index: number;
    label: string;
    variant: string;
    isVisible: boolean;
    isSelected: boolean;
    onSelect: () => void;
    onToggleVisibility: () => void;
    onRemove: () => void;
    hideLabel: string;
    showLabel: string;
    removeLabel: string;
    dragHandleLabel: string;
}

const SortableStorefrontSectionItem: React.FC<SortableStorefrontSectionItemProps> = ({
    section,
    index,
    label,
    variant,
    isVisible,
    isSelected,
    onSelect,
    onToggleVisibility,
    onRemove,
    hideLabel,
    showLabel,
    removeLabel,
    dragHandleLabel,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            role="listitem"
            className={`group flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                isSelected
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-transparent hover:bg-secondary/50'
            } ${!isVisible ? 'opacity-50' : ''} ${isDragging ? 'shadow-lg ring-1 ring-primary/30' : ''}`}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={(event) => event.stopPropagation()}
                className="flex h-7 w-7 flex-shrink-0 touch-none items-center justify-center rounded-md bg-muted text-q-text-muted transition-colors cursor-grab active:cursor-grabbing hover:bg-secondary hover:text-foreground"
                aria-label={`${dragHandleLabel}: ${label}`}
                title={`${dragHandleLabel}: ${label}`}
            >
                <GripVertical size={14} />
            </button>
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-q-text-muted">
                {index + 1}
            </span>
            <button
                type="button"
                onClick={onSelect}
                className="min-w-0 flex-1 text-left"
            >
                <span className="block truncate text-sm font-medium text-foreground">{label}</span>
                <span className="block truncate text-xs text-q-text-muted">{variant}</span>
            </button>
            <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleVisibility();
                    }}
                    className="rounded p-1 text-q-text-muted hover:bg-secondary hover:text-foreground"
                    aria-label={isVisible ? hideLabel : showLabel}
                >
                    {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove();
                    }}
                    className="rounded p-1 text-red-400 hover:bg-red-500/10"
                    aria-label={removeLabel}
                >
                    <Trash2 size={13} />
                </button>
            </span>
        </div>
    );
};

const StorefrontEditorView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId, projectId, projectName } = useEcommerceContext();
    const { projects, activeProject, refreshProjects } = useProject();
    const { products } = useProducts(user?.id || '', storeId);
    const {
        settings,
        isLoading: settingsLoading,
        isSaving: settingsSaving,
        getStorefrontTheme,
        replaceStorefrontTheme,
    } = useStoreSettings(user?.id || '', storeId);

    const project = useMemo(() => (
        projects.find(item => item.id === projectId) ||
        (activeProject?.id === projectId ? activeProject : null)
    ), [activeProject, projectId, projects]);
    const projectLastUpdated = project?.lastUpdated || (project as any)?.last_updated;
    const projectOwnerId = project?.userId || (project as any)?.user_id;

    const projectContentSignature = stableStringify({
        id: project?.id,
        data: project?.data,
        businessBlueprint: project?.businessBlueprint,
        componentOrder: project?.componentOrder,
        sectionVisibility: project?.sectionVisibility,
        lastUpdated: projectLastUpdated,
    });
    const pageData = useMemo(() => getProjectPageData(project), [project]);
    const editorState = useMemo(
        () => (isRecord(pageData.storefrontEditor) ? pageData.storefrontEditor : {}),
        [projectContentSignature],
    );
    const draftEditorConfig = useMemo(
        () => resolveStorefrontEditorConfig(project, { mode: 'draft' }),
        [projectContentSignature],
    );
    const initialOrder = useMemo(() => {
        const order = draftEditorConfig.componentOrder.length > 0
            ? draftEditorConfig.componentOrder
            : (project?.componentOrder || []).filter((section: string) => isStorefrontKind(section));
        return order.length > 0 ? order as StorefrontSectionKind[] : defaultSections;
    }, [draftEditorConfig.componentOrder, project?.componentOrder, projectContentSignature]);
    const initialSectionSettings = useMemo(
        () => buildSectionSettingsMap(
            initialOrder,
            pageData,
            {
                ...editorState,
                sectionSettings: {
                    ...toSettingsRecord(editorState.sectionSettings),
                    ...draftEditorConfig.sectionSettings,
                },
            },
            project,
        ),
        [draftEditorConfig.sectionSettings, editorState, initialOrder, pageData, projectContentSignature],
    );
    const initialVisibility = useMemo(
        () => buildCurrentStorefrontVisibility(initialOrder, draftEditorConfig.sectionVisibility),
        [draftEditorConfig.sectionVisibility, initialOrder],
    );
    const initialOrderSignature = stableStringify(initialOrder);
    const initialSectionSettingsSignature = stableStringify(initialSectionSettings);
    const projectVisibilitySignature = stableStringify(initialVisibility);
    const storedThemePresetId = getThemePresetIdFromTheme(settings?.storefrontTheme as Partial<StorefrontThemeWithPresetMetadata> | undefined);
    const persistedPresetId =
        storedThemePresetId ||
        normalizeThemePresetId(draftEditorConfig.themePresetId) ||
        normalizeThemePresetId(editorState.themePresetId) ||
        normalizeThemePresetId(editorState.themePreset) ||
        'minimal';
    const activePresetProjectKey = project?.id || projectId || storeId || 'storefront-editor';

    const [sections, setSections] = useState<StorefrontSectionKind[]>(initialOrder);
    const [visibility, setVisibility] = useState<Record<string, boolean>>({});
    const [sectionSettings, setSectionSettings] = useState<SectionSettingsMap>(initialSectionSettings);
    const [selectedSection, setSelectedSection] = useState<StorefrontSectionKind>(initialOrder[0] || defaultSections[0]);
    const [templateState, setTemplateState] = useState<TemplateState>(
        editorState.templateState === 'published' ? 'published' : 'draft'
    );
    const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
    const previewPayloadRef = useRef('');
    const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
    const selectedPresetOverrideRef = useRef<StorefrontThemePresetId | null>(null);
    const presetProjectKeyRef = useRef(activePresetProjectKey);
    const [selectedPresetId, setSelectedPresetId] = useState<StorefrontThemePresetId>(persistedPresetId);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedStructurePanel, setSelectedStructurePanel] = useState<StorefrontStructurePanel | null>(null);
    const [isStructureExpanded, setIsStructureExpanded] = useState(true);
    const [isContentExpanded, setIsContentExpanded] = useState(true);
    const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(true);
    const sectionDragSensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 120, tolerance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    useEffect(() => {
        setSections(prev => areArraysEqual(prev, initialOrder) ? prev : initialOrder);
        setVisibility(prev => {
            return stableStringify(prev) === projectVisibilitySignature ? prev : initialVisibility;
        });
        setSectionSettings(prev => (
            stableStringify(prev) === initialSectionSettingsSignature ? prev : initialSectionSettings
        ));
        setSelectedSection(prev => initialOrder.includes(prev) ? prev : initialOrder[0] || defaultSections[0]);
        setTemplateState(editorState.templateState === 'published' ? 'published' : 'draft');
        if (presetProjectKeyRef.current !== activePresetProjectKey) {
            presetProjectKeyRef.current = activePresetProjectKey;
            selectedPresetOverrideRef.current = null;
        }
        setSelectedPresetId(selectedPresetOverrideRef.current || persistedPresetId);
    }, [
        activePresetProjectKey,
        draftEditorConfig.themePresetId,
        editorState.themePreset,
        editorState.templateState,
        editorState.themePresetId,
        initialVisibility,
        initialOrder,
        initialOrderSignature,
        initialSectionSettings,
        initialSectionSettingsSignature,
        persistedPresetId,
        projectVisibilitySignature,
    ]);

    const currentTheme = getStorefrontTheme();
    const currentThemeSignature = JSON.stringify(currentTheme);
    const previewStorefrontTheme = useMemo(
        () => mergeTheme(currentTheme, selectedPresetId),
        [currentThemeSignature, selectedPresetId],
    );
    const catalogSize = getStorefrontCatalogSize(products.length);
    const availableSections = STOREFRONT_SECTION_KINDS.filter(kind => !sections.includes(kind));
    const storefrontUrl = `/store/${storeId}`;
    const previewSessionKey = `${STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX}${storeId}`;
    const previewUrl = `${storefrontUrl}?preview=storefront-editor&editorSession=${encodeURIComponent(previewSessionKey)}`;
    const selectedSectionSettings = {
        ...storefrontSectionRegistry[selectedSection].defaultSettings,
        ...toSettingsRecord(sectionSettings[selectedSection]),
    };
    const selectedSectionIsActive = visibility[selectedSection] !== false && selectedSectionSettings.enabled !== false;
    const selectedSectionValidation = validateStorefrontSectionSettings(selectedSection, selectedSectionSettings);

    const getSectionLabel = (kind: StorefrontSectionKind) =>
        t(`ecommerce.storefrontEditor.sectionLabels.${kind}`, storefrontSectionRegistry[kind].label);

    const getThemePresetLabel = (presetId: StorefrontThemePresetId) =>
        t(`ecommerce.storefrontEditor.themePresets.${presetId}.label`, STOREFRONT_THEME_PRESETS[presetId].label);

    const getThemePresetDescription = (presetId: StorefrontThemePresetId) =>
        t(`ecommerce.storefrontEditor.themePresets.${presetId}.description`, STOREFRONT_THEME_PRESETS[presetId].description);

    const getCatalogSizeLabel = (size: string) =>
        t(`ecommerce.storefrontEditor.catalogSizes.${size}`, size);

    const translateValidationMessage = (message: string) => {
        if (message.startsWith('Manual featured products')) {
            return t('ecommerce.storefrontEditor.validation.manualFeaturedProducts', message);
        }
        if (message.startsWith('saleCountdown.endDate')) {
            return t('ecommerce.storefrontEditor.validation.saleCountdownEndDate', message);
        }
        if (message.startsWith('Product bundle')) {
            return t('ecommerce.storefrontEditor.validation.productBundleEmpty', message);
        }
        if (message.startsWith('Unsupported') && message.includes('variant')) {
            return t('ecommerce.storefrontEditor.validation.unsupportedVariant', message);
        }
        if (message.startsWith('Unsupported') && message.includes('visibleIn')) {
            return t('ecommerce.storefrontEditor.validation.unsupportedVisibility', message);
        }
        return message;
    };

    const previewProjectData = useMemo(() => {
        const normalizedSettings = normalizeSectionSettings(sections, sectionSettings);
        const nextSectionVisibility = buildCurrentStorefrontVisibility(sections, {
            ...(project?.sectionVisibility || {}),
            ...visibility,
        });
        const nextComponentOrder = [
            ...(project?.componentOrder || []).filter((section: string) => !isStorefrontKind(section)),
            ...sections,
        ];
        const existingBusinessBlueprint = getProjectBusinessBlueprint(project, pageData);
        const previewBusinessBlueprint = updateBusinessBlueprintStorefrontSections(
            existingBusinessBlueprint,
            sections,
            normalizedSettings,
            nextSectionVisibility,
            selectedPresetId,
            catalogSize,
            templateState,
            String(editorState.updatedAt || projectLastUpdated || 'storefront-preview'),
            user?.id,
        ) || existingBusinessBlueprint;
        const previewStorefrontEditor = {
            ...(isRecord(pageData.storefrontEditor) ? pageData.storefrontEditor : {}),
            templateState,
            themePresetId: selectedPresetId,
            previewMode,
            sectionSettings: normalizedSettings,
            draft: buildStorefrontEditorSnapshot(
                sections,
                normalizedSettings,
                nextSectionVisibility,
                selectedPresetId,
                previewStorefrontTheme,
                String(editorState.updatedAt || projectLastUpdated || 'storefront-preview'),
                'draft',
            ),
            source: 'storefront-builder-preview',
        };
        const nextPageData = sections.reduce((acc, section) => {
            acc[section] = normalizedSettings[section];
            return acc;
        }, {
            ...pageData,
            ...(previewBusinessBlueprint ? { businessBlueprint: previewBusinessBlueprint } : {}),
            storefrontEditor: previewStorefrontEditor,
        } as Record<string, any>);

        return {
            ...project,
            id: projectId,
            name: projectName || project?.name || settings?.storeName || 'Store',
            header: buildPreviewHeader(project, pageData, previewStorefrontTheme),
            theme: buildPreviewTheme(project, previewStorefrontTheme),
            storefrontTheme: previewStorefrontTheme,
            data: nextPageData,
            componentOrder: nextComponentOrder,
            sectionVisibility: nextSectionVisibility,
            ...(previewBusinessBlueprint ? { businessBlueprint: previewBusinessBlueprint } : {}),
        };
    }, [
        catalogSize,
        pageData,
        previewMode,
        previewStorefrontTheme,
        project,
        projectId,
        projectName,
        sectionSettings,
        sections,
        selectedPresetId,
        settings?.storeName,
        templateState,
        user?.id,
        visibility,
    ]);

    const postPreviewPayload = useCallback((payload = previewPayloadRef.current) => {
        if (!payload || typeof window === 'undefined') return;

        previewFrameRef.current?.contentWindow?.postMessage({
            type: STOREFRONT_EDITOR_PREVIEW_UPDATE,
            sessionKey: previewSessionKey,
            projectId: storeId,
            payload,
        }, window.location.origin);
    }, [previewSessionKey, storeId]);

    useEffect(() => {
        if (!storeId || !project) return;

        try {
            const nextPayload = JSON.stringify(previewProjectData);
            if (nextPayload === previewPayloadRef.current) return;

            previewPayloadRef.current = nextPayload;
            window.sessionStorage.setItem(previewSessionKey, nextPayload);
            postPreviewPayload(nextPayload);
        } catch (err) {
            console.warn('Unable to prepare storefront editor preview data:', err);
        }
    }, [postPreviewPayload, previewProjectData, previewSessionKey, project, storeId]);

    const refreshPreview = () => {
        postPreviewPayload();
    };

    const markTemplateDirty = () => {
        setTemplateState(prev => prev === 'published' ? 'draft' : prev);
    };

    const handleSectionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeSection = active.id as StorefrontSectionKind;
        const overSection = over.id as StorefrontSectionKind;
        const oldIndex = sections.indexOf(activeSection);
        const newIndex = sections.indexOf(overSection);
        if (oldIndex < 0 || newIndex < 0) return;

        setSections(arrayMove(sections, oldIndex, newIndex));
        markTemplateDirty();
    };

    const updateSectionSetting = (section: StorefrontSectionKind, key: string, value: unknown) => {
        setSectionSettings(prev => ({
            ...prev,
            [section]: {
                ...storefrontSectionRegistry[section].defaultSettings,
                ...toSettingsRecord(prev[section]),
                [key]: value,
            },
        }));
        markTemplateDirty();
    };

    const updateSelectedSectionSetting = (key: string, value: unknown) => {
        updateSectionSetting(selectedSection, key, value);
    };

    const updateSectionNestedSetting = (section: StorefrontSectionKind, path: string, value: unknown) => {
        const keys = path.split('.').filter(Boolean);
        if (keys.length === 0) return;

        setSectionSettings(prev => {
            const nextSectionSettings = {
                ...storefrontSectionRegistry[section].defaultSettings,
                ...toSettingsRecord(prev[section]),
            };
            let cursor: Record<string, unknown> = nextSectionSettings;

            keys.forEach((key, index) => {
                if (index === keys.length - 1) {
                    cursor[key] = value;
                    return;
                }

                const nextValue = toSettingsRecord(cursor[key]);
                cursor[key] = nextValue;
                cursor = nextValue;
            });

            return {
                ...prev,
                [section]: nextSectionSettings,
            };
        });
        markTemplateDirty();
    };

    const updateSelectedSectionNestedSetting = (path: string, value: unknown) => {
        updateSectionNestedSetting(selectedSection, path, value);
    };

    const setStorefrontNestedData = (path: string, value: unknown) => {
        const [sectionKey, ...settingPath] = path.split('.');
        if (!isStorefrontKind(sectionKey) || settingPath.length === 0) return;
        updateSectionNestedSetting(sectionKey, settingPath.join('.'), value);
    };

    const updateNumberSetting = (key: string, rawValue: string, min: number, max: number) => {
        if (rawValue === '') {
            updateSelectedSectionSetting(key, undefined);
            return;
        }

        const numericValue = Number(rawValue);
        if (Number.isNaN(numericValue)) return;
        updateSelectedSectionSetting(key, Math.min(max, Math.max(min, numericValue)));
    };

    const resetSelectedSectionSettings = () => {
        setSectionSettings(prev => ({
            ...prev,
            [selectedSection]: { ...storefrontSectionRegistry[selectedSection].defaultSettings },
        }));
        markTemplateDirty();
    };

    const setSectionVisibility = (kind: StorefrontSectionKind, nextVisible: boolean) => {
        setVisibility(prev => ({ ...prev, [kind]: nextVisible }));
        setSectionSettings(prev => ({
            ...prev,
            [kind]: {
                ...storefrontSectionRegistry[kind].defaultSettings,
                ...toSettingsRecord(prev[kind]),
                enabled: nextVisible,
            },
        }));
        markTemplateDirty();
    };

    const addSection = (kind: StorefrontSectionKind) => {
        setSections(prev => [...prev, kind]);
        setSectionSettings(prev => ({
            ...prev,
            [kind]: { ...storefrontSectionRegistry[kind].defaultSettings },
        }));
        setSelectedSection(kind);
        setSectionVisibility(kind, true);
    };

    const removeSection = (kind: StorefrontSectionKind) => {
        setSections(prev => prev.filter(section => section !== kind));
        setSelectedSection(prev => prev === kind ? sections.find(section => section !== kind) || defaultSections[0] : prev);
        markTemplateDirty();
    };

    const showAllStorefrontSections = () => {
        const missingSections = STOREFRONT_SECTION_KINDS.filter(section => !sections.includes(section));
        const nextOrder = [...sections, ...missingSections];

        setSections(nextOrder);
        setVisibility(prev => buildCurrentStorefrontVisibility(nextOrder, prev, {
            ensureAtLeastOneVisible: true,
        }));
        setSectionSettings(prev => nextOrder.reduce((acc, section) => {
            const existingSettings = toSettingsRecord(prev[section]);
            acc[section] = {
                ...storefrontSectionRegistry[section].defaultSettings,
                ...existingSettings,
                enabled: true,
            };
            return acc;
        }, { ...prev } as SectionSettingsMap));
        setSelectedSection(prev => nextOrder.includes(prev) ? prev : nextOrder[0] || defaultSections[0]);
        setTemplateState('draft');
    };

    const applySectionPreset = () => {
        showAllStorefrontSections();
    };

    const applyThemePreset = async (presetId: StorefrontThemePresetId) => {
        setError(null);
        setStatusMessage(null);
        selectedPresetOverrideRef.current = presetId;
        setSelectedPresetId(presetId);

        try {
            await replaceStorefrontTheme(mergeTheme(currentTheme, presetId));
            setTemplateState('draft');
            setStatusMessage(t('ecommerce.storefrontEditor.themePresetApplied', 'Preset aplicado al storefront.'));
        } catch (err: any) {
            setError(err.message || t('ecommerce.storefrontEditor.themePresetError', 'No se pudo aplicar el preset.'));
        }
    };

    const handleResetStorefrontTheme = async () => {
        setError(null);
        setStatusMessage(null);
        selectedPresetOverrideRef.current = 'minimal';
        setSelectedPresetId('minimal');

        try {
            await replaceStorefrontTheme(mergeTheme(DEFAULT_STOREFRONT_THEME, 'minimal'));
            setTemplateState('draft');
            setStatusMessage(t('ecommerce.storefrontEditor.themePresetApplied', 'Preset aplicado al storefront.'));
        } catch (err: any) {
            setError(err.message || t('ecommerce.storefrontEditor.themePresetError', 'No se pudo aplicar el preset.'));
        }
    };

    const saveTemplate = async (nextState: TemplateState = templateState) => {
        if (!projectId || !project) return;

        setIsSavingTemplate(true);
        setError(null);
        setStatusMessage(null);

        try {
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
            const normalizedSettings = normalizeSectionSettings(sections, sectionSettings);
            const invalidSections = sections
                .map(section => ({
                    section,
                    validation: validateStorefrontSectionSettings(section, toSettingsRecord(normalizedSettings[section])),
                }))
                .filter(result => !result.validation.valid);
            if (invalidSections.length > 0) {
                throw new Error(invalidSections
                    .map(result => `${getSectionLabel(result.section)}: ${result.validation.errors.map(translateValidationMessage).join(', ')}`)
                    .join(' | '));
            }

            const nextSectionVisibility = buildCurrentStorefrontVisibility(sections, {
                ...currentVisibility,
                ...visibility,
            });
            const nextComponentOrder = [
                ...currentComponentOrder.filter(section => !isStorefrontKind(section)),
                ...sections,
            ] as PageSection[];
            const currentBusinessBlueprint = isRecord(dataPayload.businessBlueprint)
                ? dataPayload.businessBlueprint
                : currentPageData.businessBlueprint;
            const nextBusinessBlueprint = updateBusinessBlueprintStorefrontSections(
                currentBusinessBlueprint,
                sections,
                normalizedSettings,
                nextSectionVisibility,
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
                sections,
                normalizedSettings,
                nextSectionVisibility,
                selectedPresetId,
                previewStorefrontTheme,
                now,
                'draft',
            );
            const publishedSnapshot = nextState === 'published'
                ? buildStorefrontEditorSnapshot(
                    sections,
                    normalizedSettings,
                    nextSectionVisibility,
                    selectedPresetId,
                    previewStorefrontTheme,
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
                sectionSettings: normalizedSettings,
                draft: draftSnapshot,
                ...(publishedSnapshot ? { published: publishedSnapshot } : {}),
                updatedAt: now,
                source: 'storefront-builder',
            };
            const nextPageData = sections.reduce((acc, section) => {
                acc[section] = normalizedSettings[section];
                return acc;
            }, {
                ...currentPageData,
                ...(nextBusinessBlueprint && !hasNestedPageData ? { businessBlueprint: nextBusinessBlueprint } : {}),
                storefrontEditor: nextStorefrontEditor,
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
                    name: projectName || project.name || settings?.storeName || 'Store',
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
                        user_id: publicStoreRow?.user_id || user?.id || projectOwnerId,
                        data: publicStoreData,
                    });

                if (publicUpsertError) throw publicUpsertError;
            }

            setTemplateState(nextState);
            await refreshProjects();
            setStatusMessage(nextState === 'published'
                ? t('ecommerce.storefrontEditor.published', 'Storefront marcado como publicado.')
                : t('ecommerce.storefrontEditor.saved', 'Storefront guardado como borrador.'));
        } catch (err: any) {
            setError(err.message || t('ecommerce.storefrontEditor.saveError', 'No se pudo guardar el storefront.'));
        } finally {
            setIsSavingTemplate(false);
        }
    };

    if (!projectId || !project) {
        return (
            <div className="rounded-lg border border-q-border bg-q-surface p-6 text-sm text-q-text-muted">
                {t('ecommerce.storefrontEditor.noProject', 'Selecciona un proyecto para editar su storefront.')}
            </div>
        );
    }

    const isBusy = isSavingTemplate || settingsSaving;
    const previewDisplayName = settings?.storeName || projectName || project.name;

    const selectStructurePanel = (panel: StorefrontStructurePanel) => {
        setSelectedStructurePanel(panel);
        setIsControlsPanelOpen(true);
    };

    const selectSectionForEditing = (section: StorefrontSectionKind) => {
        setSelectedSection(section);
        setSelectedStructurePanel(null);
        setIsControlsPanelOpen(true);
    };

    const activeEditorLabel = selectedStructurePanel === 'template'
        ? t('ecommerce.storefrontEditor.templateState', 'Estado')
        : selectedStructurePanel === 'theme'
            ? t('ecommerce.storefrontEditor.themePreset', 'Preset de tema')
            : getSectionLabel(selectedSection);
    const ActiveEditorIcon = selectedStructurePanel === 'theme'
        ? Palette
        : selectedStructurePanel === 'template'
            ? LayoutTemplate
            : SlidersHorizontal;
    const renderSortableSectionList = (className = 'space-y-1') => (
        <DndContext
            sensors={sectionDragSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
        >
            <SortableContext items={sections} strategy={verticalListSortingStrategy}>
                <div className={className} role="list" aria-label={t('ecommerce.storefrontEditor.sortableSections', 'Componentes del storefront')}>
                    {sections.map((section, index) => {
                        const item = storefrontSectionRegistry[section];
                        const isVisible = visibility[section] !== false;
                        const isSelected = !selectedStructurePanel && selectedSection === section;
                        const currentVariant = String(toSettingsRecord(sectionSettings[section]).variant || item.defaultSettings.variant || section);

                        return (
                            <SortableStorefrontSectionItem
                                key={section}
                                section={section}
                                index={index}
                                label={getSectionLabel(section)}
                                variant={currentVariant}
                                isVisible={isVisible}
                                isSelected={isSelected}
                                onSelect={() => selectSectionForEditing(section)}
                                onToggleVisibility={() => setSectionVisibility(section, !isVisible)}
                                onRemove={() => removeSection(section)}
                                hideLabel={t('common.hide', 'Ocultar')}
                                showLabel={t('common.show', 'Mostrar')}
                                removeLabel={t('common.remove', 'Eliminar')}
                                dragHandleLabel={t('ecommerce.storefrontEditor.dragToReorder', 'Arrastra para reordenar')}
                            />
                        );
                    })}
                </div>
            </SortableContext>
        </DndContext>
    );

    const renderTemplateControls = () => (
        <div className="space-y-4">
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-foreground">
                            {t('ecommerce.storefrontEditor.templateState', 'Estado')}
                        </h3>
                        <p className="text-xs text-q-text-muted">
                            {t('ecommerce.storefrontEditor.templateStateHint', 'Solo controla la presentación de la tienda.')}
                        </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        templateState === 'published'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                    }`}>
                        {templateState === 'published'
                            ? t('common.published', 'Publicado')
                            : t('common.draft', 'Borrador')}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setTemplateState('draft')}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                            templateState === 'draft'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 text-q-text-muted hover:text-foreground'
                        }`}
                    >
                        {t('common.draft', 'Borrador')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setTemplateState('published')}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                            templateState === 'published'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 text-q-text-muted hover:text-foreground'
                        }`}
                    >
                        {t('common.published', 'Publicado')}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderThemeControls = () => (
        <div className="space-y-4">
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="flex items-center gap-2 font-semibold text-foreground">
                            <Palette size={17} />
                            {t('ecommerce.storefrontEditor.themePreset', 'Preset de tema')}
                        </h3>
                        <p className="text-xs text-q-text-muted">
                            {t('ecommerce.storefrontEditor.catalogSize', 'Catálogo: {{size}} · {{count}} productos', {
                                size: getCatalogSizeLabel(catalogSize),
                                count: products.length,
                            })}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleResetStorefrontTheme}
                        disabled={settingsLoading || settingsSaving}
                        className="rounded-lg bg-muted/60 p-2 text-q-text-muted hover:text-foreground disabled:opacity-50"
                        aria-label={t('common.reset', 'Restablecer')}
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>

                <div className="grid gap-2">
                    {(Object.keys(STOREFRONT_THEME_PRESETS) as StorefrontThemePresetId[]).map(presetId => {
                        const preset = STOREFRONT_THEME_PRESETS[presetId];
                        const isSelected = selectedPresetId === presetId;

                        return (
                            <button
                                key={presetId}
                                type="button"
                                onClick={() => applyThemePreset(presetId)}
                                disabled={settingsLoading || settingsSaving}
                                className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                                    isSelected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-q-border bg-q-bg/40 hover:bg-muted'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-foreground">{getThemePresetLabel(presetId)}</span>
                                    <span className="flex gap-1">
                                        {['primaryColor', 'accentColor', 'backgroundColor'].map(key => (
                                            <span
                                                key={key}
                                                className="h-4 w-4 rounded-full border border-q-border"
                                                style={{ backgroundColor: String(preset.theme[key as keyof StorefrontThemeSettings] || '#ffffff') }}
                                            />
                                        ))}
                                    </span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-q-text-muted">{getThemePresetDescription(presetId)}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderSectionControls = () => {
        const sectionControlData = { [selectedSection]: selectedSectionSettings };
        const validVariants = storefrontSectionRegistry[selectedSection].validVariants || [];
        const colors = toSettingsRecord(selectedSectionSettings.colors);
        const supportsProductCards = ['featuredProducts', 'recentlyViewed', 'saleCountdown'].includes(selectedSection);
        const supportsProductCount = ['featuredProducts', 'saleCountdown', 'recentlyViewed', 'productReviews'].includes(selectedSection);
        const supportsColumns = ['featuredProducts', 'categoryGrid', 'recentlyViewed', 'trustBadges', 'productReviews'].includes(selectedSection);
        const supportsHeight = true;
        const supportsHeroControls = selectedSection === 'productHero' || selectedSection === 'collectionBanner';
        const supportsPositionControls = true;
        const supportsBackgroundImage = true;
        const supportsCardGap = ['featuredProducts', 'categoryGrid', 'trustBadges', 'saleCountdown', 'recentlyViewed', 'productReviews', 'productBundle'].includes(selectedSection);
        const sectionTitleValue = String(
            selectedSection === 'productHero'
                ? selectedSectionSettings.headline || ''
                : selectedSectionSettings.title || '',
        );
        const sectionDescriptionValue = String(
            selectedSection === 'productHero'
                ? selectedSectionSettings.subheadline || ''
                : selectedSectionSettings.description || selectedSectionSettings.subtitle || '',
        );
        const countSettingKey = selectedSection === 'recentlyViewed'
            ? 'maxProducts'
            : selectedSection === 'productReviews'
                ? 'maxReviews'
                : 'productsToShow';
        const countFallback = selectedSection === 'recentlyViewed'
            ? 10
            : selectedSection === 'productReviews'
                ? 6
                : 8;
        const heightFallback = selectedSection === 'announcementBar'
            ? 44
            : selectedSection === 'collectionBanner' || selectedSection === 'productHero'
                ? 520
                : 360;

        const renderSectionHeader = () => (
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <SlidersHorizontal size={15} />
                            {getSectionLabel(selectedSection)}
                        </h4>
                        <p className="text-xs text-q-text-muted">
                            {t('ecommerce.storefrontEditor.sectionSettingsHint', 'Ajustes de presentación y fuente. No edita productos.')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={resetSelectedSectionSettings}
                        className="rounded-md p-1.5 text-q-text-muted hover:bg-muted hover:text-foreground"
                        aria-label={t('common.reset', 'Restablecer')}
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>

                {(selectedSectionValidation.errors.length > 0 || selectedSectionValidation.warnings.length > 0) && (
                    <div className="mt-3 space-y-1">
                        {selectedSectionValidation.errors.map(message => (
                            <p key={message} className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-400">
                                {translateValidationMessage(message)}
                            </p>
                        ))}
                        {selectedSectionValidation.warnings.map(message => (
                            <p key={message} className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                                {translateValidationMessage(message)}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        );

        const contentTab = (
            <div className="space-y-4">
                {renderSectionHeader()}

                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                        <Settings size={14} />
                        {t('ecommerce.storefrontEditor.basicSettings', 'Configuración')}
                    </label>

                    {validVariants.length > 0 && (
                        <Select
                            label={t('ecommerce.storefrontEditor.variant', 'Variante')}
                            value={String(selectedSectionSettings.variant || validVariants[0])}
                            onChange={value => updateSelectedSectionSetting('variant', value)}
                            options={validVariants.map(variant => ({ value: variant, label: variant }))}
                            noMargin
                        />
                    )}

                    <Select
                        label={t('ecommerce.storefrontEditor.visibleIn', 'Visible en')}
                        value={String(selectedSectionSettings.visibleIn || 'both')}
                        onChange={value => updateSelectedSectionSetting('visibleIn', value)}
                        options={storefrontSelectOptions.visibleIn}
                        noMargin
                    />

                    <ToggleControl
                        label={t('ecommerce.storefrontEditor.enabled', 'Activo')}
                        checked={selectedSectionIsActive}
                        onChange={value => setSectionVisibility(selectedSection, value)}
                    />
                </div>

                {selectedSection === 'announcementBar' ? (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Type size={14} />
                            {t('ecommerce.storefrontEditor.messages', 'Mensajes')}
                        </label>
                        <textarea
                            value={messagesToText(selectedSectionSettings.messages)}
                            onChange={event => updateSelectedSectionSetting('messages', textToMessages(event.target.value))}
                            rows={4}
                            className="w-full rounded-md border border-q-border/80 bg-q-bg/80 px-3 py-2.5 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                            placeholder={t('ecommerce.storefrontEditor.messagesPlaceholder', 'Un mensaje por línea')}
                        />
                    </div>
                ) : (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Type size={14} />
                            {t('controls.contentTab', 'Contenido')}
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-semibold text-q-text-secondary uppercase tracking-wider">
                                {selectedSection === 'productHero'
                                    ? t('ecommerce.storefrontEditor.headline', 'Encabezado')
                                    : t('ecommerce.storefrontEditor.titleField', 'Título')}
                            </span>
                            <input
                                type="text"
                                value={sectionTitleValue}
                                onChange={event => updateSelectedSectionSetting(selectedSection === 'productHero' ? 'headline' : 'title', event.target.value)}
                                className="mt-1 w-full rounded-md border border-q-border/80 bg-q-bg/80 px-3 py-2.5 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-semibold text-q-text-secondary uppercase tracking-wider">
                                {t('ecommerce.storefrontEditor.descriptionField', 'Descripción')}
                            </span>
                            <textarea
                                value={sectionDescriptionValue}
                                onChange={event => updateSelectedSectionSetting(selectedSection === 'productHero' ? 'subheadline' : 'description', event.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-md border border-q-border/80 bg-q-bg/80 px-3 py-2.5 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                            />
                        </label>
                    </div>
                )}

                {selectedSection === 'featuredProducts' && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Box size={14} />
                            {t('ecommerce.storefrontEditor.productSource', 'Fuente de productos')}
                        </label>
                        <Select
                            label={t('ecommerce.storefrontEditor.sourceType', 'Fuente')}
                            value={String(selectedSectionSettings.sourceType || 'newest')}
                            onChange={value => updateSelectedSectionSetting('sourceType', value)}
                            options={storefrontSelectOptions.sourceType}
                            noMargin
                        />
                    </div>
                )}

                {(selectedSection === 'featuredProducts' || selectedSection === 'saleCountdown' || selectedSection === 'productBundle') && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">
                            {t('ecommerce.storefrontEditor.productIds', 'IDs de productos')}
                        </label>
                        <textarea
                            value={toCsv(selectedSectionSettings.productIds)}
                            onChange={event => updateSelectedSectionSetting('productIds', parseCsv(event.target.value))}
                            rows={3}
                            className="w-full rounded-md border border-q-border/80 bg-q-bg/80 px-3 py-2.5 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                            placeholder={t('ecommerce.storefrontEditor.productIdsPlaceholder', 'prod_1, prod_2')}
                        />
                        <p className="mt-2 text-[11px] text-q-text-muted">
                            {t('ecommerce.storefrontEditor.productIdsHint', 'Solo selecciona fuente de presentación. Los productos se administran en Ecommerce Admin.')}
                        </p>
                    </div>
                )}

                {supportsHeroControls && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} />
                            {t('ecommerce.storefrontEditor.ctaAndTarget', 'CTA y destino')}
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-semibold text-q-text-secondary uppercase tracking-wider">
                                {selectedSection === 'productHero'
                                    ? t('ecommerce.storefrontEditor.productId', 'ID de producto')
                                    : t('ecommerce.storefrontEditor.collectionId', 'ID de colección')}
                            </span>
                            <input
                                type="text"
                                value={String(selectedSectionSettings.productId || selectedSectionSettings.collectionId || '')}
                                onChange={event => updateSelectedSectionSetting(selectedSection === 'productHero' ? 'productId' : 'collectionId', event.target.value)}
                                className="mt-1 w-full rounded-md border border-q-border/80 bg-q-bg/80 px-3 py-2.5 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-semibold text-q-text-secondary uppercase tracking-wider">
                                {t('ecommerce.storefrontEditor.buttonText', 'Texto CTA')}
                            </span>
                            <input
                                type="text"
                                value={String(selectedSectionSettings.buttonText || '')}
                                onChange={event => updateSelectedSectionSetting('buttonText', event.target.value)}
                                className="mt-1 w-full rounded-md border border-q-border/80 bg-q-bg/80 px-3 py-2.5 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                            />
                        </label>
                    </div>
                )}

                {selectedSection === 'saleCountdown' && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} />
                            {t('ecommerce.storefrontEditor.countdown', 'Cuenta regresiva')}
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-semibold text-q-text-secondary uppercase tracking-wider">
                                {t('ecommerce.storefrontEditor.endDate', 'Fin de campaña')}
                            </span>
                            <input
                                type="datetime-local"
                                value={String(selectedSectionSettings.endDate || '').slice(0, 16)}
                                onChange={event => updateSelectedSectionSetting('endDate', event.target.value)}
                                className="mt-1 w-full rounded-md border border-q-border/80 bg-q-bg/80 px-3 py-2.5 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[11px] font-semibold text-q-text-secondary uppercase tracking-wider">
                                {t('ecommerce.storefrontEditor.discountText', 'Texto de descuento')}
                            </span>
                            <input
                                type="text"
                                value={String(selectedSectionSettings.discountText || '')}
                                onChange={event => updateSelectedSectionSetting('discountText', event.target.value)}
                                className="mt-1 w-full rounded-md border border-q-border/80 bg-q-bg/80 px-3 py-2.5 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                            />
                        </label>
                    </div>
                )}
            </div>
        );

        const styleTab = (
            <div className="space-y-4">
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <AlignHorizontalJustifyCenter size={14} />
                        {t('ecommerce.storefrontEditor.layoutControls', 'Layout')}
                    </label>
                    <PaddingSelector
                        label={t('ecommerce.storefrontEditor.paddingY', 'Padding vertical')}
                        value={String(selectedSectionSettings.paddingY || 'md')}
                        onChange={value => updateSelectedSectionSetting('paddingY', value)}
                        showNone
                        showXl
                    />
                    <PaddingSelector
                        label={t('ecommerce.storefrontEditor.paddingX', 'Padding horizontal')}
                        value={String(selectedSectionSettings.paddingX || 'md')}
                        onChange={value => updateSelectedSectionSetting('paddingX', value)}
                        showNone
                        showXl
                    />
                    <BorderRadiusSelector
                        label={t('ecommerce.storefrontEditor.cornerRadius', 'Esquinas')}
                        value={String(selectedSectionSettings.borderRadius || selectedSectionSettings.buttonBorderRadius || 'xl')}
                        onChange={value => {
                            updateSelectedSectionSetting('borderRadius', value);
                            if (supportsHeroControls) updateSelectedSectionSetting('buttonBorderRadius', value);
                        }}
                        extended
                    />
                    {supportsHeight && (
                        <SliderControl
                            label={t('ecommerce.storefrontEditor.height', 'Altura')}
                            value={getSettingNumber(selectedSectionSettings, 'height', heightFallback)}
                            onChange={value => updateSelectedSectionSetting('height', value)}
                            min={selectedSection === 'announcementBar' ? 28 : 160}
                            max={selectedSection === 'announcementBar' ? 96 : 900}
                            step={selectedSection === 'announcementBar' ? 2 : 10}
                            suffix="px"
                        />
                    )}
                    <FontSizeSelector
                        label={t('ecommerce.storefrontEditor.titleSize', 'Tamaño de título')}
                        value={String(
                            selectedSection === 'announcementBar'
                                ? selectedSectionSettings.fontSize || 'sm'
                                : selectedSectionSettings.titleFontSize || selectedSectionSettings.headlineFontSize || 'lg',
                        )}
                        onChange={value => {
                            if (selectedSection === 'announcementBar') {
                                updateSelectedSectionSetting('fontSize', value);
                                return;
                            }
                            updateSelectedSectionSetting('titleFontSize', value);
                            updateSelectedSectionSetting('headlineFontSize', value);
                        }}
                    />
                    {supportsColumns && (
                        <SliderControl
                            label={t('ecommerce.storefrontEditor.columns', 'Columnas')}
                            value={getSettingNumber(selectedSectionSettings, 'columns', selectedSection === 'categoryGrid' ? 4 : 4)}
                            onChange={value => updateSelectedSectionSetting('columns', value)}
                            min={2}
                            max={selectedSection === 'categoryGrid' || selectedSection === 'recentlyViewed' ? 6 : 5}
                            step={1}
                        />
                    )}
                </div>

                {supportsPositionControls && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Maximize2 size={14} />
                            {t('ecommerce.storefrontEditor.positionControls', 'Posición')}
                        </label>
                        {selectedSection === 'productHero' && (
                            <>
                                <Select
                                    label={t('ecommerce.storefrontEditor.layout', 'Layout')}
                                    value={String(selectedSectionSettings.layout || 'split')}
                                    onChange={value => updateSelectedSectionSetting('layout', value)}
                                    options={[
                                        { value: 'split', label: 'Split izquierda' },
                                        { value: 'split-right', label: 'Split derecha' },
                                        { value: 'full', label: 'Full image' },
                                        { value: 'centered', label: 'Centrado' },
                                    ]}
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.imageSize', 'Tamaño de imagen')}
                                    value={String(selectedSectionSettings.imageSize || 'medium')}
                                    onChange={value => updateSelectedSectionSetting('imageSize', value)}
                                    options={[
                                        { value: 'small', label: 'Pequeña' },
                                        { value: 'medium', label: 'Media' },
                                        { value: 'large', label: 'Grande' },
                                    ]}
                                />
                            </>
                        )}
                        <Select
                            label={t('ecommerce.storefrontEditor.contentPosition', 'Posición de contenido')}
                            value={String(selectedSectionSettings.contentPosition || 'center')}
                            onChange={value => updateSelectedSectionSetting('contentPosition', value)}
                            options={storefrontSelectOptions.alignment}
                        />
                        <Select
                            label={t('ecommerce.storefrontEditor.textAlignment', 'Alineación de texto')}
                            value={String(selectedSectionSettings.textAlignment || 'center')}
                            onChange={value => updateSelectedSectionSetting('textAlignment', value)}
                            options={storefrontSelectOptions.alignment}
                        />
                    </div>
                )}

                {(supportsProductCards || supportsCardGap || selectedSection === 'categoryGrid') && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Columns3 size={14} />
                            {t('ecommerce.storefrontEditor.cardControls', 'Tarjetas')}
                        </label>
                        {supportsProductCards && (
                            <>
                                <Select
                                    label={t('ecommerce.storefrontEditor.cardStyle', 'Diseño de tarjeta')}
                                    value={String(selectedSectionSettings.cardStyle || 'overlay')}
                                    onChange={value => updateSelectedSectionSetting('cardStyle', value)}
                                    options={storefrontSelectOptions.productCardStyle}
                                    noMargin
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.cardAspectRatio', 'Proporción de tarjeta')}
                                    value={String(selectedSectionSettings.cardAspectRatio || '4:5')}
                                    onChange={value => updateSelectedSectionSetting('cardAspectRatio', value)}
                                    options={storefrontSelectOptions.aspectRatio}
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.imageFit', 'Ajuste de imagen')}
                                    value={String(selectedSectionSettings.imageObjectFit || 'cover')}
                                    onChange={value => updateSelectedSectionSetting('imageObjectFit', value)}
                                    options={storefrontSelectOptions.objectFit}
                                />
                            </>
                        )}
                        {supportsCardGap && (
                            <Select
                                label={t('ecommerce.storefrontEditor.cardGap', 'Separación')}
                                value={String(selectedSectionSettings.cardGap || 'md')}
                                onChange={value => updateSelectedSectionSetting('cardGap', value)}
                                options={storefrontSelectOptions.cardGap}
                            />
                        )}
                        {selectedSection === 'trustBadges' && (
                            <Select
                                label={t('ecommerce.storefrontEditor.iconSize', 'Tamaño de icono')}
                                value={String(selectedSectionSettings.iconSize || 'md')}
                                onChange={value => updateSelectedSectionSetting('iconSize', value)}
                                options={[
                                    { value: 'sm', label: 'Pequeño' },
                                    { value: 'md', label: 'Medio' },
                                    { value: 'lg', label: 'Grande' },
                                ]}
                            />
                        )}
                        {selectedSection === 'categoryGrid' && (
                            <>
                                <Select
                                    label={t('ecommerce.storefrontEditor.categoryCardStyle', 'Diseño de categoría')}
                                    value={String(selectedSectionSettings.variant || 'overlay')}
                                    onChange={value => updateSelectedSectionSetting('variant', value)}
                                    options={(storefrontSectionRegistry.categoryGrid.validVariants || []).map(variant => ({ value: variant, label: variant }))}
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.imageRatio', 'Proporción de imagen')}
                                    value={String(selectedSectionSettings.imageAspectRatio || '1:1')}
                                    onChange={value => updateSelectedSectionSetting('imageAspectRatio', value)}
                                    options={storefrontSelectOptions.aspectRatio}
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.imageFit', 'Ajuste de imagen')}
                                    value={String(selectedSectionSettings.imageObjectFit || 'cover')}
                                    onChange={value => updateSelectedSectionSetting('imageObjectFit', value)}
                                    options={storefrontSelectOptions.objectFit}
                                />
                            </>
                        )}
                        {supportsProductCount && (
                            <SliderControl
                                label={selectedSection === 'recentlyViewed'
                                    ? t('ecommerce.storefrontEditor.maxProducts', 'Máximo')
                                    : selectedSection === 'productReviews'
                                        ? t('ecommerce.storefrontEditor.maxReviews', 'Reseñas')
                                    : t('ecommerce.storefrontEditor.productsToShow', 'Productos')}
                                value={getSettingNumber(selectedSectionSettings, countSettingKey, countFallback)}
                                onChange={value => updateSelectedSectionSetting(countSettingKey, value)}
                                min={1}
                                max={24}
                                step={1}
                            />
                        )}
                    </div>
                )}

                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                        <Palette size={14} />
                        {t('ecommerce.storefrontEditor.colors', 'Colores')}
                    </label>
                    <ColorControl label={t('editor.controls.common.background', 'Fondo')} value={String(colors.background || '#ffffff')} onChange={value => updateSelectedSectionNestedSetting('colors.background', value)} />
                    <ColorControl label={t('editor.controls.common.title', 'Título')} value={String(colors.heading || '#0f172a')} onChange={value => updateSelectedSectionNestedSetting('colors.heading', value)} />
                    <ColorControl label={t('controls.text', 'Texto')} value={String(colors.text || '#475569')} onChange={value => updateSelectedSectionNestedSetting('colors.text', value)} />
                    <ColorControl label={t('controls.accent', 'Acento')} value={String(colors.accent || colors.iconColor || '#4f46e5')} onChange={value => {
                        updateSelectedSectionNestedSetting('colors.accent', value);
                        updateSelectedSectionNestedSetting('colors.iconColor', value);
                    }} />
                    {(supportsProductCards || selectedSection === 'categoryGrid' || selectedSection === 'trustBadges' || selectedSection === 'productReviews' || selectedSection === 'productBundle') && (
                        <>
                            <ColorControl label={t('controls.cardBackground', 'Fondo tarjeta')} value={String(colors.cardBackground || '#ffffff')} onChange={value => updateSelectedSectionNestedSetting('colors.cardBackground', value)} />
                            <ColorControl label={t('controls.cardText', 'Texto tarjeta')} value={String(colors.cardText || colors.heading || '#0f172a')} onChange={value => updateSelectedSectionNestedSetting('colors.cardText', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.cardBorder', 'Borde tarjeta')} value={String(colors.borderColor || '#e2e8f0')} onChange={value => updateSelectedSectionNestedSetting('colors.borderColor', value)} />
                        </>
                    )}
                    {supportsProductCards && (
                        <>
                            <ColorControl label={t('ecommerce.storefrontEditor.priceColor', 'Precio')} value={String(colors.priceColor || colors.salePriceColor || colors.accent || '#111827')} onChange={value => updateSelectedSectionNestedSetting('colors.priceColor', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.salePriceColor', 'Precio oferta')} value={String(colors.salePriceColor || '#dc2626')} onChange={value => updateSelectedSectionNestedSetting('colors.salePriceColor', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.badgeBackground', 'Fondo badge')} value={String(colors.badgeBackground || '#ef4444')} onChange={value => updateSelectedSectionNestedSetting('colors.badgeBackground', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.badgeText', 'Texto badge')} value={String(colors.badgeText || '#ffffff')} onChange={value => updateSelectedSectionNestedSetting('colors.badgeText', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.starColor', 'Estrellas')} value={String(colors.starColor || '#f59e0b')} onChange={value => updateSelectedSectionNestedSetting('colors.starColor', value)} />
                        </>
                    )}
                    {selectedSection === 'productReviews' && (
                        <>
                            <ColorControl label={t('ecommerce.storefrontEditor.starColor', 'Estrellas')} value={String(colors.starColor || '#f59e0b')} onChange={value => updateSelectedSectionNestedSetting('colors.starColor', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.verifiedBadgeColor', 'Verificado')} value={String(colors.verifiedBadgeColor || '#16a34a')} onChange={value => updateSelectedSectionNestedSetting('colors.verifiedBadgeColor', value)} />
                        </>
                    )}
                    {selectedSection === 'productBundle' && (
                        <>
                            <ColorControl label={t('ecommerce.storefrontEditor.priceColor', 'Precio')} value={String(colors.priceColor || colors.accent || '#111827')} onChange={value => updateSelectedSectionNestedSetting('colors.priceColor', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.savingsColor', 'Ahorro')} value={String(colors.savingsColor || '#16a34a')} onChange={value => updateSelectedSectionNestedSetting('colors.savingsColor', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.badgeBackground', 'Fondo badge')} value={String(colors.badgeBackground || colors.accent || '#4f46e5')} onChange={value => updateSelectedSectionNestedSetting('colors.badgeBackground', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.badgeText', 'Texto badge')} value={String(colors.badgeText || '#ffffff')} onChange={value => updateSelectedSectionNestedSetting('colors.badgeText', value)} />
                        </>
                    )}
                    {(supportsProductCards || selectedSection === 'categoryGrid') && (
                        <>
                            <ColorControl label={t('ecommerce.storefrontEditor.overlayStart', 'Overlay inicio')} value={String(colors.overlayStart || 'transparent')} onChange={value => updateSelectedSectionNestedSetting('colors.overlayStart', value)} />
                            <ColorControl label={t('ecommerce.storefrontEditor.overlayEnd', 'Overlay final')} value={String(colors.overlayEnd || 'rgba(0,0,0,0.75)')} onChange={value => updateSelectedSectionNestedSetting('colors.overlayEnd', value)} />
                        </>
                    )}
                    {supportsHeroControls && (
                        <ColorControl label={t('ecommerce.storefrontEditor.overlayColor', 'Color overlay')} value={String(colors.overlayColor || '#000000')} onChange={value => updateSelectedSectionNestedSetting('colors.overlayColor', value)} />
                    )}
                    {(supportsHeroControls || selectedSection === 'saleCountdown' || selectedSection === 'productBundle') && (
                        <>
                            <ColorControl label={t('controls.fondoBotn', 'Fondo botón')} value={String(colors.buttonBackground || '#111827')} onChange={value => updateSelectedSectionNestedSetting('colors.buttonBackground', value)} />
                            <ColorControl label={t('editor.controls.common.buttonText', 'Texto botón')} value={String(colors.buttonText || '#ffffff')} onChange={value => updateSelectedSectionNestedSetting('colors.buttonText', value)} />
                        </>
                    )}
                </div>

                {supportsBackgroundImage && (
                    <BackgroundImageControl
                        sectionKey={selectedSection}
                        data={sectionControlData}
                        setNestedData={setStorefrontNestedData}
                    />
                )}

                {supportsHeroControls && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon size={14} />
                            {t('ecommerce.storefrontEditor.overlayControls', 'Overlay')}
                        </label>
                        <Select
                            label={t('ecommerce.storefrontEditor.overlayStyle', 'Tipo de overlay')}
                            value={String(selectedSectionSettings.overlayStyle || 'gradient')}
                            onChange={value => updateSelectedSectionSetting('overlayStyle', value)}
                            options={storefrontSelectOptions.overlayStyle}
                        />
                        <SliderControl
                            label={t('ecommerce.storefrontEditor.overlayOpacity', 'Opacidad')}
                            value={getSettingNumber(selectedSectionSettings, 'overlayOpacity', 55)}
                            onChange={value => updateSelectedSectionSetting('overlayOpacity', value)}
                            min={0}
                            max={100}
                            step={5}
                            suffix="%"
                        />
                    </div>
                )}

                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <CornerGradientControl
                        enabled={getSettingBoolean(selectedSectionSettings, 'cornerGradient.enabled', false)}
                        position={(getSettingString(selectedSectionSettings, 'cornerGradient.position', 'top-right') || 'top-right') as any}
                        color={getSettingString(selectedSectionSettings, 'cornerGradient.color', '#fbbf24')}
                        opacity={getSettingNumber(selectedSectionSettings, 'cornerGradient.opacity', 35)}
                        size={getSettingNumber(selectedSectionSettings, 'cornerGradient.size', 45)}
                        onEnabledChange={value => updateSelectedSectionNestedSetting('cornerGradient.enabled', value)}
                        onPositionChange={value => updateSelectedSectionNestedSetting('cornerGradient.position', value)}
                        onColorChange={value => updateSelectedSectionNestedSetting('cornerGradient.color', value)}
                        onOpacityChange={value => updateSelectedSectionNestedSetting('cornerGradient.opacity', value)}
                        onSizeChange={value => updateSelectedSectionNestedSetting('cornerGradient.size', value)}
                    />
                </div>
            </div>
        );

        const advancedTab = (
            <div className="space-y-4">
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                        <Eye size={14} />
                        {t('ecommerce.storefrontEditor.displayOptions', 'Opciones de visualización')}
                    </label>
                    {supportsProductCards && (
                        <>
                            <ToggleControl label={t('ecommerce.storefrontEditor.showPrice', 'Mostrar precio')} checked={getSettingBoolean(selectedSectionSettings, 'showPrice', true)} onChange={value => updateSelectedSectionSetting('showPrice', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.showRating', 'Mostrar reseñas')} checked={getSettingBoolean(selectedSectionSettings, 'showRating', true)} onChange={value => updateSelectedSectionSetting('showRating', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.showBadge', 'Mostrar badges')} checked={getSettingBoolean(selectedSectionSettings, 'showBadge', true)} onChange={value => updateSelectedSectionSetting('showBadge', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.showAddToCart', 'Mostrar agregar carrito')} checked={getSettingBoolean(selectedSectionSettings, 'showAddToCart', true)} onChange={value => updateSelectedSectionSetting('showAddToCart', value)} />
                        </>
                    )}
                    {selectedSection === 'categoryGrid' && (
                        <ToggleControl label={t('ecommerce.storefrontEditor.showProductCount', 'Mostrar conteo')} checked={getSettingBoolean(selectedSectionSettings, 'showProductCount', true)} onChange={value => updateSelectedSectionSetting('showProductCount', value)} />
                    )}
                    {selectedSection === 'trustBadges' && (
                        <ToggleControl label={t('ecommerce.storefrontEditor.showLabels', 'Mostrar labels')} checked={getSettingBoolean(selectedSectionSettings, 'showLabels', true)} onChange={value => updateSelectedSectionSetting('showLabels', value)} />
                    )}
                    {selectedSection === 'productReviews' && (
                        <>
                            <ToggleControl label={t('ecommerce.storefrontEditor.showRatingDistribution', 'Mostrar distribución')} checked={getSettingBoolean(selectedSectionSettings, 'showRatingDistribution', true)} onChange={value => updateSelectedSectionSetting('showRatingDistribution', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.showPhotos', 'Mostrar fotos')} checked={getSettingBoolean(selectedSectionSettings, 'showPhotos', true)} onChange={value => updateSelectedSectionSetting('showPhotos', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.showVerifiedBadge', 'Mostrar verificado')} checked={getSettingBoolean(selectedSectionSettings, 'showVerifiedBadge', true)} onChange={value => updateSelectedSectionSetting('showVerifiedBadge', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.showProductInfo', 'Mostrar producto')} checked={getSettingBoolean(selectedSectionSettings, 'showProductInfo', false)} onChange={value => updateSelectedSectionSetting('showProductInfo', value)} />
                        </>
                    )}
                    {selectedSection === 'announcementBar' && (
                        <>
                            <ToggleControl label={t('ecommerce.storefrontEditor.showIcon', 'Mostrar icono')} checked={getSettingBoolean(selectedSectionSettings, 'showIcon', true)} onChange={value => updateSelectedSectionSetting('showIcon', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.dismissible', 'Dismissible')} checked={getSettingBoolean(selectedSectionSettings, 'dismissible', false)} onChange={value => updateSelectedSectionSetting('dismissible', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.pauseOnHover', 'Pausar en hover')} checked={getSettingBoolean(selectedSectionSettings, 'pauseOnHover', true)} onChange={value => updateSelectedSectionSetting('pauseOnHover', value)} />
                        </>
                    )}
                    {selectedSection === 'saleCountdown' && (
                        <>
                            <ToggleControl label={t('ecommerce.storefrontEditor.showProducts', 'Mostrar productos')} checked={getSettingBoolean(selectedSectionSettings, 'showProducts', true)} onChange={value => updateSelectedSectionSetting('showProducts', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.showDays', 'Días')} checked={getSettingBoolean(selectedSectionSettings, 'showDays', true)} onChange={value => updateSelectedSectionSetting('showDays', value)} />
                            <ToggleControl label={t('ecommerce.storefrontEditor.showSeconds', 'Segundos')} checked={getSettingBoolean(selectedSectionSettings, 'showSeconds', true)} onChange={value => updateSelectedSectionSetting('showSeconds', value)} />
                        </>
                    )}
                </div>

                {(selectedSection === 'announcementBar' || selectedSection === 'featuredProducts' || selectedSection === 'recentlyViewed') && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                            {t('ecommerce.storefrontEditor.motion', 'Movimiento')}
                        </label>
                        {(selectedSection === 'featuredProducts' || selectedSection === 'recentlyViewed') && (
                            <ToggleControl label={t('ecommerce.storefrontEditor.autoScroll', 'Auto scroll')} checked={getSettingBoolean(selectedSectionSettings, 'autoScroll', false)} onChange={value => updateSelectedSectionSetting('autoScroll', value)} />
                        )}
                        <SliderControl
                            label={t('ecommerce.storefrontEditor.speed', 'Velocidad')}
                            value={getSettingNumber(selectedSectionSettings, 'speed', getSettingNumber(selectedSectionSettings, 'scrollSpeed', 5000))}
                            onChange={value => {
                                updateSelectedSectionSetting('speed', value);
                                updateSelectedSectionSetting('scrollSpeed', value);
                            }}
                            min={1000}
                            max={12000}
                            step={500}
                            suffix="ms"
                        />
                    </div>
                )}

                {selectedSection === 'productBundle' && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                            {t('ecommerce.storefrontEditor.bundleGuardrails', 'Bundle')}
                        </label>
                        <SliderControl
                            label={t('ecommerce.storefrontEditor.discountPercent', 'Descuento sugerido')}
                            value={getSettingNumber(selectedSectionSettings, 'discountPercent', 15)}
                            onChange={value => updateSelectedSectionSetting('discountPercent', value)}
                            min={0}
                            max={90}
                            step={1}
                            suffix="%"
                        />
                        <ToggleControl label={t('ecommerce.storefrontEditor.showSavings', 'Mostrar ahorro')} checked={getSettingBoolean(selectedSectionSettings, 'showSavings', true)} onChange={value => updateSelectedSectionSetting('showSavings', value)} />
                        <ToggleControl label={t('ecommerce.storefrontEditor.showIndividualPrices', 'Mostrar precios individuales')} checked={getSettingBoolean(selectedSectionSettings, 'showIndividualPrices', true)} onChange={value => updateSelectedSectionSetting('showIndividualPrices', value)} />
                        <ToggleControl label={t('ecommerce.storefrontEditor.showBadge', 'Mostrar badge')} checked={getSettingBoolean(selectedSectionSettings, 'showBadge', true)} onChange={value => updateSelectedSectionSetting('showBadge', value)} />
                    </div>
                )}
            </div>
        );

        return <TabbedControls contentTab={contentTab} styleTab={styleTab} advancedTab={advancedTab} />;
    };

    const renderActiveControls = () => {
        if (selectedStructurePanel === 'template') return renderTemplateControls();
        if (selectedStructurePanel === 'theme') return renderThemeControls();
        return renderSectionControls();
    };

    return (
        <div className="-m-3 flex h-[calc(100vh-7rem)] min-h-[720px] flex-col overflow-hidden bg-q-bg sm:-m-6 lg:-m-8">
            <header className="quimera-dashboard-header-bar h-14 flex-shrink-0 px-3 lg:px-4 flex items-center justify-between gap-3 z-20">
                <div className="flex min-w-0 items-center gap-3">
                    <LayoutTemplate className="h-5 w-5 quimera-dashboard-header-icon" strokeWidth={2} />
                    <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
                            {previewDisplayName}
                        </h2>
                        <p className="hidden truncate text-xs text-q-text-muted md:block">
                            {t('ecommerce.storefrontEditor.title', 'Editor de tienda online')}
                        </p>
                    </div>
                    <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold md:inline-flex ${
                        templateState === 'published'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                    }`}>
                        {templateState === 'published'
                            ? t('common.published', 'Publicado')
                            : t('common.draft', 'Borrador')}
                    </span>
                </div>

                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
                        {([
                            ['desktop', Monitor, t('ecommerce.storefrontEditor.desktop', 'Escritorio')],
                            ['tablet', Tablet, t('ecommerce.storefrontEditor.tablet', 'Tablet')],
                            ['mobile', Smartphone, t('ecommerce.storefrontEditor.mobile', 'Móvil')],
                        ] as const).map(([mode, Icon, label]) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setPreviewMode(mode)}
                                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                                    previewMode === mode
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-q-text-muted hover:bg-q-bg/50 hover:text-foreground'
                                }`}
                            >
                                <Icon size={16} />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ml-auto flex flex-shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={refreshPreview}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-q-text-muted transition-colors hover:bg-secondary/50 hover:text-foreground"
                        aria-label={t('ecommerce.storefrontEditor.refreshPreview', 'Actualizar preview')}
                        title={t('ecommerce.storefrontEditor.refreshPreview', 'Actualizar preview')}
                    >
                        <RefreshCw size={16} />
                    </button>
                    <a
                        href={storefrontUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-q-text-muted transition-colors hover:bg-secondary/50 hover:text-foreground sm:inline-flex"
                    >
                        <ExternalLink size={16} />
                        <span>{t('ecommerce.storefrontEditor.openStorefront', 'Abrir tienda')}</span>
                    </a>
                    <button
                        type="button"
                        onClick={() => saveTemplate('draft')}
                        disabled={isBusy}
                        className="flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-q-text-muted transition-colors hover:bg-secondary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSavingTemplate ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        <span className="hidden sm:inline">{t('common.save', 'Guardar')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => saveTemplate('published')}
                        disabled={isBusy}
                        className="quimera-guide-cta flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CheckCircle2 size={16} />
                        <span className="hidden sm:inline">{t('ecommerce.storefrontEditor.publishTemplate', 'Publicar')}</span>
                    </button>
                </div>
            </header>

            {(statusMessage || error) && (
                <div className={`z-20 flex flex-shrink-0 items-center gap-2 border-b px-4 py-2 text-sm ${
                    error
                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                }`}>
                    {error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    <span className="truncate">{error || statusMessage}</span>
                </div>
            )}

            <main className="relative flex min-h-0 flex-1 overflow-hidden">
                <aside className="hidden w-64 flex-shrink-0 flex-col overflow-hidden border-r border-q-border bg-q-surface/50 md:flex lg:w-72">
                    <div className="border-b border-q-border p-3">
                        <button
                            type="button"
                            className="flex h-10 w-full items-center justify-between rounded-lg border border-q-border bg-q-bg px-3 text-left text-sm font-medium text-foreground"
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <LayoutTemplate size={15} />
                                <span className="truncate">{t('ecommerce.storefrontEditor.onlineStore', 'Tienda online')}</span>
                            </span>
                            <ChevronDown size={15} className="text-q-text-muted" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between border-b border-q-border px-4 py-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {t('landingEditor.pageStructure', 'ESTRUCTURA DE PÁGINA')}
                        </h3>
                        <button
                            type="button"
                            onClick={applySectionPreset}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-secondary/50"
                            title={t('ecommerce.storefrontEditor.showAllSections', 'Mostrar todos los componentes')}
                        >
                            <Plus size={15} />
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                        <div className="mb-4">
                            <button
                                type="button"
                                onClick={() => setIsStructureExpanded(prev => !prev)}
                                className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-secondary/30"
                            >
                                <ChevronDown size={14} className={`transition-transform ${isStructureExpanded ? '' : '-rotate-90'}`} />
                                <Settings size={14} />
                                <span>{t('landingEditor.structure', 'ESTRUCTURA')}</span>
                                <span className="text-q-text-muted">(2)</span>
                            </button>

                            {isStructureExpanded && (
                                <div className="mt-1 space-y-0.5 pl-2">
                                    {([
                                        ['template', LayoutTemplate, t('ecommerce.storefrontEditor.templateState', 'Estado')],
                                        ['theme', Palette, t('ecommerce.storefrontEditor.themePreset', 'Preset de tema')],
                                    ] as const).map(([panel, Icon, label]) => (
                                        <button
                                            key={panel}
                                            type="button"
                                            onClick={() => selectStructurePanel(panel)}
                                            className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                                                selectedStructurePanel === panel
                                                    ? 'border-primary/30 bg-primary/10'
                                                    : 'border-transparent hover:bg-secondary/50'
                                            }`}
                                        >
                                            <Icon size={16} className="flex-shrink-0 text-q-text-muted" />
                                            <span className="truncate text-sm font-medium">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={() => setIsContentExpanded(prev => !prev)}
                                className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-secondary/30"
                            >
                                <ChevronDown size={14} className={`transition-transform ${isContentExpanded ? '' : '-rotate-90'}`} />
                                <FileText size={14} />
                                <span>{t('landingEditor.content', 'CONTENIDO')}</span>
                                <span className="text-q-text-muted">({sections.length})</span>
                            </button>

                            {isContentExpanded && (
                                <div className="mt-1 pl-2">
                                    <p className="mb-2 px-2 text-[11px] font-medium text-q-text-muted">
                                        {t('ecommerce.storefrontEditor.dragSectionsHint', 'Arrastra cualquier componente para cambiar el orden.')}
                                    </p>
                                    {renderSortableSectionList('space-y-1')}
                                </div>
                            )}
                        </div>

                        {availableSections.length > 0 && (
                            <div className="mt-5 border-t border-q-border pt-4">
                                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                    {t('ecommerce.storefrontEditor.addSection', 'Agregar sección')}
                                </p>
                                <div className="space-y-1">
                                    {availableSections.map(section => (
                                        <button
                                            key={section}
                                            type="button"
                                            onClick={() => addSection(section)}
                                            className="flex w-full items-center justify-between rounded-lg border border-q-border bg-q-bg/40 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                                        >
                                            <span className="truncate">{getSectionLabel(section)}</span>
                                            <Plus size={15} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/30 p-3 sm:p-4">
                    <div
                        className="mx-auto flex h-full w-full flex-col overflow-hidden rounded-xl border border-q-border bg-q-surface shadow-2xl transition-all duration-300"
                        style={{
                            width: previewWidths[previewMode],
                            maxWidth: '100%',
                        }}
                    >
                        <div className="flex h-11 flex-shrink-0 items-center border-b border-q-border bg-q-bg px-4">
                            <div className="flex gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-500" />
                                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                                <span className="h-3 w-3 rounded-full bg-green-500" />
                            </div>
                            <div className="flex flex-1 items-center justify-center px-4">
                                <div className="flex w-full max-w-md items-center justify-center truncate rounded-full border border-q-border/50 bg-secondary/50 px-4 py-1 text-center text-xs text-q-text-muted sm:text-sm">
                                    <span className="opacity-50">https://quimera.ai/</span>
                                    <span className="font-medium text-foreground">{String(previewDisplayName).toLowerCase().replace(/\s+/g, '-')}</span>
                                </div>
                            </div>
                            <div className="w-14" />
                        </div>
                        <iframe
                            ref={previewFrameRef}
                            title={t('ecommerce.storefrontEditor.previewTitle', 'Vista previa de tienda online')}
                            src={previewUrl}
                            onLoad={() => postPreviewPayload()}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            scrolling="yes"
                            className="min-h-0 flex-1 border-0 bg-white"
                            style={{ minHeight: MIN_PREVIEW_FRAME_HEIGHT }}
                        />
                    </div>
                </section>

                <button
                    type="button"
                    onClick={() => setIsControlsPanelOpen(prev => !prev)}
                    className={`absolute top-1/2 z-30 -translate-y-1/2 overflow-hidden rounded-lg border border-q-border bg-q-surface p-2 shadow-lg transition-all duration-300 hover:bg-accent ${
                        isControlsPanelOpen
                            ? 'right-[calc(20rem-18px)] lg:right-[calc(24rem-18px)]'
                            : 'right-0 rounded-r-none'
                    }`}
                    title={isControlsPanelOpen ? t('common.hide', 'Ocultar') : t('common.show', 'Mostrar')}
                >
                    {isControlsPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>

                <aside className={`${isControlsPanelOpen ? 'w-80 lg:w-96' : 'w-0'} editor-theme flex flex-shrink-0 flex-col overflow-hidden border-l border-q-border bg-q-bg transition-all duration-300`}>
                    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-q-border px-4">
                        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-q-text">
                            <ActiveEditorIcon size={16} className="flex-shrink-0 text-q-accent" />
                            <span className="truncate">
                                {t('landingEditor.edit', 'Editar')}: {activeEditorLabel}
                            </span>
                        </h3>
                    </div>
                    <div className="quimera-clean-controls min-h-0 flex-1 overflow-y-auto p-4">
                        {renderActiveControls()}
                    </div>
                </aside>
            </main>
        </div>
    );

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-q-text-muted">
                        <LayoutTemplate size={16} />
                        {t('ecommerce.storefrontEditor.kicker', 'Storefront Builder')}
                    </div>
                    <h2 className="mt-1 text-2xl font-bold text-foreground">
                        {t('ecommerce.storefrontEditor.title', 'Editor de Storefront')}
                    </h2>
                    <p className="text-q-text-muted">
                        {projectName || project.name} · {t('ecommerce.storefrontEditor.presentationOnly', 'Presentación, secciones y tema. Productos, precios e inventario viven en Ecommerce Admin.')}
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <a
                        href={storefrontUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-q-border bg-q-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                        <ExternalLink size={16} />
                        {t('ecommerce.storefrontEditor.openStorefront', 'Abrir storefront')}
                    </a>
                    <button
                        type="button"
                        onClick={() => saveTemplate('draft')}
                        disabled={isBusy}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-q-border bg-q-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                    >
                        {isSavingTemplate ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {t('common.save', 'Guardar')}
                    </button>
                    <button
                        type="button"
                        onClick={() => saveTemplate('published')}
                        disabled={isBusy}
                        className="quimera-guide-cta inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    >
                        <CheckCircle2 size={16} />
                        {t('ecommerce.storefrontEditor.publishTemplate', 'Publicar plantilla')}
                    </button>
                </div>
            </div>

            {(statusMessage || error) && (
                <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                    error
                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                }`}>
                    {error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    {error || statusMessage}
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="space-y-5">
                    <section className="rounded-lg border border-q-border bg-q-surface p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    {t('ecommerce.storefrontEditor.templateState', 'Estado')}
                                </h3>
                                <p className="text-xs text-q-text-muted">
                                    {t('ecommerce.storefrontEditor.templateStateHint', 'Solo controla presentación del storefront.')}
                                </p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                templateState === 'published'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-400'
                            }`}>
                                {templateState === 'published'
                                    ? t('common.published', 'Publicado')
                                    : t('common.draft', 'Borrador')}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setTemplateState('draft')}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                                    templateState === 'draft'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted/50 text-q-text-muted hover:text-foreground'
                                }`}
                            >
                                {t('common.draft', 'Borrador')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTemplateState('published')}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                                    templateState === 'published'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted/50 text-q-text-muted hover:text-foreground'
                                }`}
                            >
                                {t('common.published', 'Publicado')}
                            </button>
                        </div>
                    </section>

                    <section className="rounded-lg border border-q-border bg-q-surface p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    {t('ecommerce.storefrontEditor.sections', 'Secciones')}
                                </h3>
                                <p className="text-xs text-q-text-muted">
                                    {t('ecommerce.storefrontEditor.sectionsHint', 'Orden y visibilidad de módulos storefront.')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={applySectionPreset}
                                className="rounded-lg bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                                {t('ecommerce.storefrontEditor.showAllSections', 'Mostrar todos')}
                            </button>
                        </div>

                        {renderSortableSectionList('space-y-2')}

                        {sections.includes(selectedSection) && (
                            <div className="mt-4 rounded-lg border border-q-border bg-q-bg/50 p-3">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <SlidersHorizontal size={15} />
                                            {getSectionLabel(selectedSection)}
                                        </h4>
                                        <p className="text-xs text-q-text-muted">
                                            {t('ecommerce.storefrontEditor.sectionSettingsHint', 'Settings de presentación y fuente. No edita productos.')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={resetSelectedSectionSettings}
                                        className="rounded-md p-1.5 text-q-text-muted hover:bg-muted hover:text-foreground"
                                        aria-label={t('common.reset', 'Restablecer')}
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>

                                {(selectedSectionValidation.errors.length > 0 || selectedSectionValidation.warnings.length > 0) && (
                                    <div className="mb-3 space-y-1">
                                        {selectedSectionValidation.errors.map(message => (
                                            <p key={message} className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-400">
                                                {translateValidationMessage(message)}
                                            </p>
                                        ))}
                                        {selectedSectionValidation.warnings.map(message => (
                                            <p key={message} className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                                                {translateValidationMessage(message)}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {storefrontSectionRegistry[selectedSection].validVariants && (
                                        <label className="block">
                                            <span className="text-xs font-semibold text-q-text-muted">
                                                {t('ecommerce.storefrontEditor.variant', 'Variant')}
                                            </span>
                                            <select
                                                value={String(selectedSectionSettings.variant || '')}
                                                onChange={event => updateSelectedSectionSetting('variant', event.target.value)}
                                                className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                            >
                                                {storefrontSectionRegistry[selectedSection].validVariants?.map(variant => (
                                                    <option key={variant} value={variant}>{variant}</option>
                                                ))}
                                            </select>
                                        </label>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="block">
                                            <span className="text-xs font-semibold text-q-text-muted">
                                                {t('ecommerce.storefrontEditor.visibleIn', 'Visible en')}
                                            </span>
                                            <select
                                                value={String(selectedSectionSettings.visibleIn || 'both')}
                                                onChange={event => updateSelectedSectionSetting('visibleIn', event.target.value)}
                                                className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                            >
                                                <option value="both">{t('ecommerce.storefrontEditor.visibleBoth', 'Landing + Store')}</option>
                                                <option value="store">{t('ecommerce.storefrontEditor.visibleStore', 'Store')}</option>
                                                <option value="landing">{t('ecommerce.storefrontEditor.visibleLanding', 'Landing')}</option>
                                            </select>
                                        </label>

                                        <label className="block">
                                            <span className="text-xs font-semibold text-q-text-muted">
                                                {t('ecommerce.storefrontEditor.enabled', 'Enabled')}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setSectionVisibility(selectedSection, !selectedSectionIsActive)}
                                                className={`mt-1 flex h-10 w-full items-center justify-center rounded-lg border text-sm font-semibold ${
                                                    !selectedSectionIsActive
                                                        ? 'border-q-border bg-q-surface text-q-text-muted'
                                                        : 'border-primary bg-primary/10 text-primary'
                                                }`}
                                            >
                                                {!selectedSectionIsActive
                                                    ? t('common.disabled', 'Desactivado')
                                                    : t('common.enabled', 'Activo')}
                                            </button>
                                        </label>
                                    </div>

                                    {selectedSection === 'announcementBar' ? (
                                        <label className="block">
                                            <span className="text-xs font-semibold text-q-text-muted">
                                                {t('ecommerce.storefrontEditor.messages', 'Mensajes')}
                                            </span>
                                            <textarea
                                                value={messagesToText(selectedSectionSettings.messages)}
                                                onChange={event => updateSelectedSectionSetting('messages', textToMessages(event.target.value))}
                                                rows={3}
                                                className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                placeholder={t('ecommerce.storefrontEditor.messagesPlaceholder', 'Un mensaje por línea')}
                                            />
                                        </label>
                                    ) : (
                                        <>
                                            <label className="block">
                                                <span className="text-xs font-semibold text-q-text-muted">
                                                    {selectedSection === 'productHero'
                                                        ? t('ecommerce.storefrontEditor.headline', 'Headline')
                                                        : t('ecommerce.storefrontEditor.titleField', 'Título')}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={String(selectedSectionSettings.title || selectedSectionSettings.headline || '')}
                                                    onChange={event => updateSelectedSectionSetting(
                                                        selectedSection === 'productHero' ? 'headline' : 'title',
                                                        event.target.value,
                                                    )}
                                                    className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="text-xs font-semibold text-q-text-muted">
                                                    {t('ecommerce.storefrontEditor.descriptionField', 'Descripción')}
                                                </span>
                                                <textarea
                                                    value={String(selectedSectionSettings.description || selectedSectionSettings.subheadline || '')}
                                                    onChange={event => updateSelectedSectionSetting(
                                                        selectedSection === 'productHero' ? 'subheadline' : 'description',
                                                        event.target.value,
                                                    )}
                                                    rows={2}
                                                    className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                        </>
                                    )}

                                    {(selectedSection === 'featuredProducts' || selectedSection === 'saleCountdown') && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="block">
                                                <span className="text-xs font-semibold text-q-text-muted">
                                                    {t('ecommerce.storefrontEditor.productsToShow', 'Productos')}
                                                </span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={24}
                                                    value={String(selectedSectionSettings.productsToShow || '')}
                                                    onChange={event => updateNumberSetting('productsToShow', event.target.value, 1, 24)}
                                                    className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            {selectedSection === 'featuredProducts' && (
                                                <label className="block">
                                                    <span className="text-xs font-semibold text-q-text-muted">
                                                        {t('ecommerce.storefrontEditor.columns', 'Columnas')}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min={2}
                                                        max={5}
                                                        value={String(selectedSectionSettings.columns || '')}
                                                        onChange={event => updateNumberSetting('columns', event.target.value, 2, 5)}
                                                        className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    )}

                                    {selectedSection === 'featuredProducts' && (
                                        <label className="block">
                                            <span className="text-xs font-semibold text-q-text-muted">
                                                {t('ecommerce.storefrontEditor.sourceType', 'Fuente')}
                                            </span>
                                            <select
                                                value={String(selectedSectionSettings.sourceType || 'newest')}
                                                onChange={event => updateSelectedSectionSetting('sourceType', event.target.value)}
                                                className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                            >
                                                <option value="newest">{t('ecommerce.storefrontEditor.sourceNewest', 'Nuevos')}</option>
                                                <option value="on-sale">{t('ecommerce.storefrontEditor.sourceOnSale', 'En oferta')}</option>
                                                <option value="category">{t('ecommerce.storefrontEditor.sourceCategory', 'Categoría')}</option>
                                                <option value="manual">{t('ecommerce.storefrontEditor.sourceManual', 'Manual')}</option>
                                            </select>
                                        </label>
                                    )}

                                    {(selectedSection === 'featuredProducts' || selectedSection === 'saleCountdown' || selectedSection === 'productBundle') && (
                                        <label className="block">
                                            <span className="text-xs font-semibold text-q-text-muted">
                                                {t('ecommerce.storefrontEditor.productIds', 'Product IDs')}
                                            </span>
                                            <textarea
                                                value={toCsv(selectedSectionSettings.productIds)}
                                                onChange={event => updateSelectedSectionSetting('productIds', parseCsv(event.target.value))}
                                                rows={2}
                                                className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                placeholder={t('ecommerce.storefrontEditor.productIdsPlaceholder', 'prod_1, prod_2')}
                                            />
                                        </label>
                                    )}

                                    {selectedSection === 'recentlyViewed' && (
                                        <label className="block">
                                            <span className="text-xs font-semibold text-q-text-muted">
                                                {t('ecommerce.storefrontEditor.maxProducts', 'Máximo')}
                                            </span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={20}
                                                value={String(selectedSectionSettings.maxProducts || '')}
                                                onChange={event => updateNumberSetting('maxProducts', event.target.value, 1, 20)}
                                                className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                            />
                                        </label>
                                    )}

                                    {selectedSection === 'saleCountdown' && (
                                        <label className="block">
                                            <span className="text-xs font-semibold text-q-text-muted">
                                                {t('ecommerce.storefrontEditor.endDate', 'Fin de campaña')}
                                            </span>
                                            <input
                                                type="datetime-local"
                                                value={String(selectedSectionSettings.endDate || '').slice(0, 16)}
                                                onChange={event => updateSelectedSectionSetting('endDate', event.target.value)}
                                                className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                            />
                                        </label>
                                    )}

                                    {(selectedSection === 'collectionBanner' || selectedSection === 'productHero') && (
                                        <>
                                            <label className="block">
                                                <span className="text-xs font-semibold text-q-text-muted">
                                                    {selectedSection === 'productHero'
                                                        ? t('ecommerce.storefrontEditor.productId', 'Product ID')
                                                        : t('ecommerce.storefrontEditor.collectionId', 'Collection ID')}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={String(selectedSectionSettings.productId || selectedSectionSettings.collectionId || '')}
                                                    onChange={event => updateSelectedSectionSetting(
                                                        selectedSection === 'productHero' ? 'productId' : 'collectionId',
                                                        event.target.value,
                                                    )}
                                                    className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="text-xs font-semibold text-q-text-muted">
                                                    {t('ecommerce.storefrontEditor.buttonText', 'Texto CTA')}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={String(selectedSectionSettings.buttonText || '')}
                                                    onChange={event => updateSelectedSectionSetting('buttonText', event.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                        </>
                                    )}

                                    {selectedSection === 'collectionBanner' && (
                                        <>
                                            <label className="block">
                                                <span className="text-xs font-semibold text-q-text-muted">
                                                    {t('ecommerce.storefrontEditor.backgroundImageUrl', 'Imagen de fondo')}
                                                </span>
                                                <input
                                                    type="url"
                                                    value={String(selectedSectionSettings.backgroundImageUrl || '')}
                                                    onChange={event => updateSelectedSectionSetting('backgroundImageUrl', event.target.value)}
                                                    className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="text-xs font-semibold text-q-text-muted">
                                                    {t('ecommerce.storefrontEditor.height', 'Altura')}
                                                </span>
                                                <input
                                                    type="number"
                                                    min={240}
                                                    max={720}
                                                    value={String(selectedSectionSettings.height || '')}
                                                    onChange={event => updateNumberSetting('height', event.target.value, 240, 720)}
                                                    className="mt-1 w-full rounded-lg border border-q-border bg-q-surface px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {availableSections.length > 0 && (
                            <div className="mt-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-q-text-muted">
                                    {t('ecommerce.storefrontEditor.addSection', 'Agregar sección')}
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                    {availableSections.map(section => (
                                        <button
                                            key={section}
                                            type="button"
                                            onClick={() => addSection(section)}
                                            className="flex items-center justify-between rounded-lg border border-q-border bg-q-bg/40 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                        >
                                            {getSectionLabel(section)}
                                            <Plus size={15} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="rounded-lg border border-q-border bg-q-surface p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                                    <Palette size={17} />
                                    {t('ecommerce.storefrontEditor.themePreset', 'Theme preset')}
                                </h3>
                                <p className="text-xs text-q-text-muted">
                                    {t('ecommerce.storefrontEditor.catalogSize', 'Catálogo: {{size}} · {{count}} productos', {
                                        size: getCatalogSizeLabel(catalogSize),
                                        count: products.length,
                                    })}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleResetStorefrontTheme}
                                disabled={settingsLoading || settingsSaving}
                                className="rounded-lg bg-muted/60 p-2 text-q-text-muted hover:text-foreground disabled:opacity-50"
                                aria-label={t('common.reset', 'Restablecer')}
                            >
                                <RefreshCw size={15} />
                            </button>
                        </div>

                        <div className="grid gap-2">
                            {(Object.keys(STOREFRONT_THEME_PRESETS) as StorefrontThemePresetId[]).map(presetId => {
                                const preset = STOREFRONT_THEME_PRESETS[presetId];
                                const isSelected = selectedPresetId === presetId;

                                return (
                                    <button
                                        key={presetId}
                                        type="button"
                                        onClick={() => applyThemePreset(presetId)}
                                        disabled={settingsLoading || settingsSaving}
                                        className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                                            isSelected
                                                ? 'border-primary bg-primary/10'
                                                : 'border-q-border bg-q-bg/40 hover:bg-muted'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold text-foreground">{getThemePresetLabel(presetId)}</span>
                                            <span className="flex gap-1">
                                                {['primaryColor', 'accentColor', 'backgroundColor'].map(key => (
                                                    <span
                                                        key={key}
                                                        className="h-4 w-4 rounded-full border border-q-border"
                                                        style={{ backgroundColor: String(preset.theme[key as keyof StorefrontThemeSettings] || '#ffffff') }}
                                                    />
                                                ))}
                                            </span>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-xs text-q-text-muted">{getThemePresetDescription(presetId)}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </aside>

                <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-q-border bg-q-surface xl:h-[calc(100vh-10rem)] xl:min-h-[760px]">
                    <div className="flex flex-col gap-3 border-b border-q-border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-foreground">
                                {t('ecommerce.storefrontEditor.preview', 'Preview')}
                            </h3>
                            <p className="truncate text-xs text-q-text-muted">
                                {settings?.storeName || projectName || project.name} · {previewUrl}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={refreshPreview}
                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-q-bg text-q-text-muted hover:text-foreground"
                                aria-label={t('ecommerce.storefrontEditor.refreshPreview', 'Actualizar preview')}
                                title={t('ecommerce.storefrontEditor.refreshPreview', 'Actualizar preview')}
                            >
                                <RefreshCw size={16} />
                            </button>
                            <div className="grid grid-cols-3 gap-1 rounded-lg bg-q-bg p-1">
                                {([
                                    ['desktop', Monitor],
                                    ['tablet', Tablet],
                                    ['mobile', Smartphone],
                                ] as const).map(([mode, Icon]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setPreviewMode(mode)}
                                        className={`flex h-9 w-10 items-center justify-center rounded-md ${
                                            previewMode === mode
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-q-text-muted hover:text-foreground'
                                        }`}
                                        aria-label={mode}
                                    >
                                        <Icon size={16} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="min-h-[640px] flex-1 overflow-hidden bg-q-bg p-3 sm:p-5">
                        <div
                            className="mx-auto h-full overflow-hidden rounded-lg border border-q-border bg-white shadow-xl transition-all"
                            style={{
                                width: previewWidths[previewMode],
                                maxWidth: '100%',
                                minHeight: MIN_PREVIEW_FRAME_HEIGHT,
                            }}
                        >
                            <iframe
                                ref={previewFrameRef}
                                title={t('ecommerce.storefrontEditor.previewTitle', 'Storefront preview')}
                                src={previewUrl}
                                onLoad={() => postPreviewPayload()}
                                scrolling="yes"
                                className="h-full w-full border-0 bg-white"
                                style={{ minHeight: MIN_PREVIEW_FRAME_HEIGHT }}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default StorefrontEditorView;
