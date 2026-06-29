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
    Search,
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
import type { StorefrontThemeSettings } from '../../../../types/ecommerce';
import type { Category, Product } from '../../../../types/ecommerce';
import type { StorefrontThemePresetId } from '../../../../types/storefrontTheme';
import type { StorefrontSectionKind } from '../../../../types/storefrontRenderer';
import ColorControl from '../../../ui/ColorControl';
import MobileBottomSheet from '../../../ui/MobileBottomSheet';
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
    resolveStorefrontEditorInitialOrder,
    storefrontSectionRegistry,
    STOREFRONT_SECTION_KINDS,
    validateStorefrontSectionSettings,
} from '../../../../utils/storefrontRenderer';
import { STOREFRONT_THEME_PRESETS } from '../../../../utils/storefrontTheme';
import { useEcommerceContext } from '../EcommerceContext';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useStoreSettings } from '../hooks/useStoreSettings';

type PreviewMode = 'desktop' | 'tablet' | 'mobile';
type TemplateState = 'draft' | 'published';
type SectionSettingsMap = Partial<Record<StorefrontSectionKind, Record<string, unknown>>>;
type StorefrontStructurePanel = 'template';

const defaultSections: StorefrontSectionKind[] = [...STOREFRONT_SECTION_KINDS];

const previewWidths: Record<PreviewMode, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
};

const STOREFRONT_EDITOR_PREVIEW_SESSION_PREFIX = 'quimera:storefront-editor-preview:';
const STOREFRONT_EDITOR_PREVIEW_UPDATE = 'quimera:storefront-editor-preview:update';
const STOREFRONT_EDITOR_SELECT_SECTION = 'quimera:storefront-editor:select-section';
const STOREFRONT_EDITOR_SECTION_CLICK = 'quimera:storefront-editor:section-click';
const SIDEBAR_SECTION_SCROLL_RETRY_DELAYS = [0, 80, 180, 320];

const isRecord = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isStorefrontKind = (value: string): value is StorefrontSectionKind =>
    STOREFRONT_SECTION_KINDS.includes(value as StorefrontSectionKind);

const isStorefrontThemePresetId = (value: unknown): value is StorefrontThemePresetId => (
    typeof value === 'string' && value in STOREFRONT_THEME_PRESETS
);

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
    themeSettings: StorefrontThemeSettings,
    now: string,
    state: TemplateState,
): Record<string, unknown> => ({
    componentOrder: sections,
    sectionVisibility: sections.reduce((acc, section) => {
        acc[section] = visibility[section] !== false;
        return acc;
    }, {} as Record<string, boolean>),
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

const normalizeIdList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    if (typeof value === 'string') return parseCsv(value);
    return [];
};

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

type StorefrontEditorSelectOption = {
    value: string;
    labelKey: string;
    fallback: string;
};

const storefrontSelectOptions: Record<string, StorefrontEditorSelectOption[]> = {
    padding: [
        { value: 'none', labelKey: 'padding.none', fallback: '0' },
        { value: 'sm', labelKey: 'padding.sm', fallback: 'SM' },
        { value: 'md', labelKey: 'padding.md', fallback: 'MD' },
        { value: 'lg', labelKey: 'padding.lg', fallback: 'LG' },
        { value: 'xl', labelKey: 'padding.xl', fallback: 'XL' },
    ],
    productCardStyle: [
        { value: 'overlay', labelKey: 'cardStyle.overlay', fallback: 'Imagen completa' },
        { value: 'modern', labelKey: 'cardStyle.modern', fallback: 'Modern' },
        { value: 'elegant', labelKey: 'cardStyle.elegant', fallback: 'Elegant' },
        { value: 'minimal', labelKey: 'cardStyle.minimal', fallback: 'Minimal' },
        { value: 'luxury', labelKey: 'cardStyle.luxury', fallback: 'Luxury' },
        { value: 'marketplace', labelKey: 'cardStyle.marketplace', fallback: 'Marketplace' },
        { value: 'editorial', labelKey: 'cardStyle.editorial', fallback: 'Editorial' },
        { value: 'imageFirst', labelKey: 'cardStyle.imageFirst', fallback: 'Image First' },
        { value: 'quickBuy', labelKey: 'cardStyle.quickBuy', fallback: 'Quick Buy' },
        { value: 'compact', labelKey: 'cardStyle.compact', fallback: 'Compact' },
    ],
    categoryCardStyle: [
        { value: 'overlay', labelKey: 'categoryCardStyle.overlay', fallback: 'Imagen completa' },
        { value: 'bento-overlay', labelKey: 'categoryCardStyle.bentoOverlay', fallback: 'Bento overlay' },
        { value: 'editorial', labelKey: 'categoryCardStyle.editorial', fallback: 'Editorial' },
        { value: 'cards', labelKey: 'categoryCardStyle.cards', fallback: 'Cards' },
        { value: 'banner', labelKey: 'categoryCardStyle.banner', fallback: 'Banner' },
        { value: 'minimal', labelKey: 'categoryCardStyle.minimal', fallback: 'Minimal' },
    ],
    trustBadgeVariant: [
        { value: 'premium-strip', labelKey: 'variant.premium-strip', fallback: 'Franja premium' },
        { value: 'icon-cloud', labelKey: 'variant.icon-cloud', fallback: 'Nube de iconos' },
        { value: 'detailed', labelKey: 'variant.detailed', fallback: 'Detallado' },
        { value: 'grid', labelKey: 'variant.grid', fallback: 'Grid' },
        { value: 'horizontal', labelKey: 'variant.horizontal', fallback: 'Horizontal' },
        { value: 'minimal', labelKey: 'variant.minimal', fallback: 'Minimal' },
    ],
    productReviewsVariant: [
        { value: 'spotlight', labelKey: 'variant.spotlight', fallback: 'Spotlight editorial' },
        { value: 'featured', labelKey: 'variant.featured', fallback: 'Destacada' },
        { value: 'masonry', labelKey: 'variant.masonry', fallback: 'Masonry' },
        { value: 'cards', labelKey: 'variant.cards', fallback: 'Cards' },
        { value: 'list', labelKey: 'variant.list', fallback: 'Lista' },
    ],
    productBundleVariant: [
        { value: 'editorial', labelKey: 'variant.editorial', fallback: 'Editorial landing' },
        { value: 'price-stack', labelKey: 'variant.price-stack', fallback: 'Precio destacado' },
        { value: 'horizontal', labelKey: 'variant.horizontal', fallback: 'Horizontal' },
        { value: 'vertical', labelKey: 'variant.vertical', fallback: 'Vertical' },
        { value: 'compact', labelKey: 'variant.compact', fallback: 'Compacto' },
    ],
    cardGap: [
        { value: 'sm', labelKey: 'spacing.compact', fallback: 'Compacto' },
        { value: 'md', labelKey: 'spacing.normal', fallback: 'Normal' },
        { value: 'lg', labelKey: 'spacing.wide', fallback: 'Amplio' },
        { value: 'xl', labelKey: 'spacing.editorial', fallback: 'Editorial' },
    ],
    aspectRatio: [
        { value: '1:1', labelKey: 'aspectRatio.1-1', fallback: '1:1' },
        { value: '4:3', labelKey: 'aspectRatio.4-3', fallback: '4:3' },
        { value: '3:4', labelKey: 'aspectRatio.3-4', fallback: '3:4' },
        { value: '4:5', labelKey: 'aspectRatio.4-5', fallback: '4:5' },
        { value: '16:9', labelKey: 'aspectRatio.16-9', fallback: '16:9' },
        { value: '9:16', labelKey: 'aspectRatio.9-16', fallback: '9:16' },
    ],
    objectFit: [
        { value: 'cover', labelKey: 'objectFit.cover', fallback: 'Cover' },
        { value: 'contain', labelKey: 'objectFit.contain', fallback: 'Contain' },
        { value: 'fill', labelKey: 'objectFit.fill', fallback: 'Fill' },
    ],
    alignment: [
        { value: 'left', labelKey: 'alignment.left', fallback: 'Izquierda' },
        { value: 'center', labelKey: 'alignment.center', fallback: 'Centro' },
        { value: 'right', labelKey: 'alignment.right', fallback: 'Derecha' },
    ],
    overlayStyle: [
        { value: 'gradient', labelKey: 'overlayStyle.gradient', fallback: 'Degradado' },
        { value: 'solid', labelKey: 'overlayStyle.solid', fallback: 'Sólido' },
        { value: 'none', labelKey: 'overlayStyle.none', fallback: 'Sin overlay' },
    ],
    visibleIn: [
        { value: 'both', labelKey: 'visibleIn.both', fallback: 'Landing + tienda' },
        { value: 'store', labelKey: 'visibleIn.store', fallback: 'Tienda' },
        { value: 'landing', labelKey: 'visibleIn.landing', fallback: 'Landing' },
    ],
    sourceType: [
        { value: 'newest', labelKey: 'sourceType.newest', fallback: 'Nuevos' },
        { value: 'on-sale', labelKey: 'sourceType.onSale', fallback: 'En oferta' },
        { value: 'category', labelKey: 'sourceType.category', fallback: 'Categoría' },
        { value: 'manual', labelKey: 'sourceType.manual', fallback: 'Manual' },
    ],
    heroLayout: [
        { value: 'split', labelKey: 'heroLayout.split', fallback: 'Split izquierda' },
        { value: 'split-right', labelKey: 'heroLayout.splitRight', fallback: 'Split derecha' },
        { value: 'full', labelKey: 'heroLayout.full', fallback: 'Full image' },
        { value: 'centered', labelKey: 'heroLayout.centered', fallback: 'Centrado' },
    ],
    imageSize: [
        { value: 'small', labelKey: 'imageSize.small', fallback: 'Pequeña' },
        { value: 'medium', labelKey: 'imageSize.medium', fallback: 'Media' },
        { value: 'large', labelKey: 'imageSize.large', fallback: 'Grande' },
    ],
    iconSize: [
        { value: 'sm', labelKey: 'iconSize.sm', fallback: 'Pequeño' },
        { value: 'md', labelKey: 'iconSize.md', fallback: 'Medio' },
        { value: 'lg', labelKey: 'iconSize.lg', fallback: 'Grande' },
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
    templateState: TemplateState,
    now: string,
    userId?: string,
    themePreset?: StorefrontThemePresetId,
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
            ...(themePreset ? {
                themePreset,
                templatePreset: storefrontBlueprint.templatePreset || themePreset,
                themeFallbackChain: [
                    'DEFAULT_STOREFRONT_THEME',
                    `preset:${themePreset}`,
                    'brandColors',
                    'projectGlobalColors',
                    'storefrontTheme',
                ],
            } : {}),
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
    onItemRef?: (section: StorefrontSectionKind, node: HTMLDivElement | null) => void;
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
    onItemRef,
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
    const setCombinedNodeRef = React.useCallback((node: HTMLDivElement | null) => {
        setNodeRef(node);
        onItemRef?.(section, node);
    }, [onItemRef, section, setNodeRef]);

    return (
        <div
            ref={setCombinedNodeRef}
            style={style}
            role="listitem"
            tabIndex={0}
            aria-current={isSelected ? 'true' : undefined}
            data-storefront-editor-sidebar-section={section}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelect();
            }}
            className={`group flex w-full cursor-pointer items-center gap-2 rounded-[var(--q-radius-md)] border p-2.5 text-left transition-all ${
                isSelected
                    ? 'border-q-accent bg-q-accent text-q-text-on-accent shadow-[var(--shadow-card)] dark:bg-q-accent/10 dark:text-q-accent dark:border-q-accent/30 dark:shadow-none black:bg-q-accent/10 black:text-q-accent black:border-q-accent/30 black:shadow-none'
                    : 'border-transparent hover:border-structure-control-border hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))]'
            } ${!isVisible ? 'opacity-50' : ''} ${isDragging ? 'shadow-lg ring-1 ring-primary/30' : ''}`}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={(event) => event.stopPropagation()}
                className={`flex h-7 w-7 flex-shrink-0 touch-none items-center justify-center rounded-[var(--q-radius-md)] transition-colors cursor-grab active:cursor-grabbing ${
                    isSelected
                        ? 'bg-q-text-on-accent/12 text-q-text-on-accent/75 hover:text-q-text-on-accent dark:bg-q-accent/12 dark:text-q-accent/75 dark:hover:text-q-accent black:bg-q-accent/12 black:text-q-accent/75 black:hover:text-q-accent'
                        : 'bg-structure-control text-q-text-muted hover:bg-structure-control-hover hover:text-q-text'
                }`}
                aria-label={`${dragHandleLabel}: ${label}`}
                title={`${dragHandleLabel}: ${label}`}
            >
                <GripVertical size={14} />
            </button>
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[var(--q-radius-md)] text-xs font-bold ${
                isSelected
                    ? 'bg-q-text-on-accent/12 text-q-text-on-accent dark:bg-q-accent/12 dark:text-q-accent black:bg-q-accent/12 black:text-q-accent'
                    : 'bg-structure-control text-q-text-muted group-hover:text-q-text'
            }`}>
                {index + 1}
            </span>
            <div className="min-w-0 flex-1 text-left">
                <span className={isSelected ? 'block truncate text-sm font-medium text-q-text-on-accent dark:text-q-accent black:text-q-accent' : 'block truncate text-sm font-medium text-foreground'}>{label}</span>
                <span className={isSelected ? 'block truncate text-xs text-q-text-on-accent/75 dark:text-q-accent/75 black:text-q-accent/75' : 'block truncate text-xs text-q-text-muted'}>{variant}</span>
            </div>
            <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleVisibility();
                    }}
                    className={isSelected ? 'rounded p-1 text-q-text-on-accent/75 hover:bg-q-text-on-accent/12 hover:text-q-text-on-accent dark:text-q-accent/75 dark:hover:bg-q-accent/12 dark:hover:text-q-accent black:text-q-accent/75 black:hover:bg-q-accent/12 black:hover:text-q-accent' : 'rounded p-1 text-q-text-muted hover:bg-structure-control-hover hover:text-q-text'}
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
                    className={isSelected ? 'rounded p-1 text-q-text-on-accent/75 hover:bg-q-surface/25 hover:text-q-error dark:text-q-accent/75 dark:hover:bg-q-error/10 dark:hover:text-q-error black:text-q-accent/75 black:hover:bg-q-error/10 black:hover:text-q-error' : 'rounded p-1 text-q-error hover:bg-q-error/10'}
                    aria-label={removeLabel}
                >
                    <Trash2 size={13} />
                </button>
            </span>
        </div>
    );
};

interface StorefrontProductChooserProps {
    products: Product[];
    selectedIds: string[];
    mode: 'single' | 'multiple';
    title: string;
    description: string;
    searchPlaceholder: string;
    emptyLabel: string;
    noMatchesLabel: string;
    selectedLabel: string;
    clearLabel: string;
    notFoundLabel: string;
    onChange: (productIds: string[]) => void;
}

const formatStorefrontProductPrice = (product: Product): string => {
    const currency = product.currency || 'USD';

    try {
        return new Intl.NumberFormat('es-US', {
            style: 'currency',
            currency,
        }).format(product.price || 0);
    } catch {
        return `$${Number(product.price || 0).toFixed(2)}`;
    }
};

const StorefrontProductChooser: React.FC<StorefrontProductChooserProps> = ({
    products,
    selectedIds,
    mode,
    title,
    description,
    searchPlaceholder,
    emptyLabel,
    noMatchesLabel,
    selectedLabel,
    clearLabel,
    notFoundLabel,
    onChange,
}) => {
    const [query, setQuery] = useState('');
    const normalizedQuery = query.trim().toLowerCase();
    const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const missingIds = selectedIds.filter(id => !productById.has(id));
    const filteredProducts = useMemo(() => {
        if (!normalizedQuery) return products;

        return products.filter(product => {
            const haystack = [
                product.name,
                product.sku,
                product.slug,
                product.status,
                ...(product.tags || []),
            ].filter(Boolean).join(' ').toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [normalizedQuery, products]);

    const toggleProduct = (productId: string) => {
        if (mode === 'single') {
            onChange(selectedSet.has(productId) ? [] : [productId]);
            return;
        }

        onChange(selectedSet.has(productId)
            ? selectedIds.filter(id => id !== productId)
            : [...selectedIds, productId]);
    };

    return (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                        {title}
                    </label>
                    <p className="mt-1 text-[11px] leading-4 text-q-text-muted">{description}</p>
                </div>
                {selectedIds.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-q-text-muted hover:bg-muted hover:text-foreground"
                    >
                        {clearLabel}
                    </button>
                )}
            </div>

            <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-q-text-muted" />
                <input
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md border border-q-border/80 bg-q-bg/80 py-2 pl-9 pr-3 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                />
            </div>

            <div className="text-[11px] font-medium text-q-text-muted">
                {selectedIds.length} {selectedLabel}
            </div>

            {products.length === 0 ? (
                <div className="rounded-md border border-dashed border-q-border px-3 py-4 text-sm text-q-text-muted">
                    {emptyLabel}
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="rounded-md border border-dashed border-q-border px-3 py-4 text-sm text-q-text-muted">
                    {noMatchesLabel}
                </div>
            ) : (
                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                    {filteredProducts.map(product => {
                        const isSelected = selectedSet.has(product.id);
                        const imageUrl = product.images?.[0]?.url;

                        return (
                            <button
                                key={product.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => toggleProduct(product.id)}
                                className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                                    isSelected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-q-border bg-q-bg/40 hover:bg-muted'
                                }`}
                            >
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-q-text-muted">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <Box size={18} />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-foreground">{product.name}</span>
                                        {isSelected && <CheckCircle2 size={14} className="flex-shrink-0 text-primary" />}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-q-text-muted">
                                        <span>{formatStorefrontProductPrice(product)}</span>
                                        <span>{product.status}</span>
                                        {product.sku && <span>SKU {product.sku}</span>}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {missingIds.length > 0 && (
                <div className="space-y-1 rounded-md border border-q-accent/20 bg-q-accent/10 p-2">
                    <p className="text-[11px] text-q-accent">{notFoundLabel}</p>
                    <div className="flex flex-wrap gap-1">
                        {missingIds.map(id => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onChange(selectedIds.filter(selectedId => selectedId !== id))}
                                className="rounded bg-q-accent/15 px-2 py-0.5 text-[11px] text-q-accent hover:bg-q-accent/25"
                            >
                                {id}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

interface StorefrontCategoryChooserProps {
    categories: Category[];
    selectedValue: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    emptyLabel: string;
    noMatchesLabel: string;
    clearLabel: string;
    onChange: (categorySlug: string) => void;
}

const StorefrontCategoryChooser: React.FC<StorefrontCategoryChooserProps> = ({
    categories,
    selectedValue,
    title,
    description,
    searchPlaceholder,
    emptyLabel,
    noMatchesLabel,
    clearLabel,
    onChange,
}) => {
    const [query, setQuery] = useState('');
    const normalizedQuery = query.trim().toLowerCase();
    const filteredCategories = useMemo(() => {
        if (!normalizedQuery) return categories;

        return categories.filter(category => {
            const haystack = [
                category.name,
                category.slug,
                category.description,
            ].filter(Boolean).join(' ').toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [categories, normalizedQuery]);

    return (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                        {title}
                    </label>
                    <p className="mt-1 text-[11px] leading-4 text-q-text-muted">{description}</p>
                </div>
                {selectedValue && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-q-text-muted hover:bg-muted hover:text-foreground"
                    >
                        {clearLabel}
                    </button>
                )}
            </div>

            <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-q-text-muted" />
                <input
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-md border border-q-border/80 bg-q-bg/80 py-2 pl-9 pr-3 text-sm text-q-text focus:border-q-accent/70 focus:outline-none focus:ring-2 focus:ring-q-accent/25"
                />
            </div>

            {categories.length === 0 ? (
                <div className="rounded-md border border-dashed border-q-border px-3 py-4 text-sm text-q-text-muted">
                    {emptyLabel}
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="rounded-md border border-dashed border-q-border px-3 py-4 text-sm text-q-text-muted">
                    {noMatchesLabel}
                </div>
            ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                    {filteredCategories.map(category => {
                        const value = category.slug || category.id;
                        const isSelected = selectedValue === value || selectedValue === category.id;

                        return (
                            <button
                                key={category.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => onChange(isSelected ? '' : value)}
                                className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                                    isSelected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-q-border bg-q-bg/40 hover:bg-muted'
                                }`}
                            >
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-q-text-muted">
                                    {category.imageUrl ? (
                                        <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <LayoutTemplate size={18} />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-foreground">{category.name}</span>
                                        {isSelected && <CheckCircle2 size={14} className="flex-shrink-0 text-primary" />}
                                    </div>
                                    <div className="mt-0.5 truncate text-[11px] text-q-text-muted">
                                        /category/{value}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const StorefrontEditorView: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { storeId, projectId, projectName } = useEcommerceContext();
    const { projects, activeProject, refreshProjects } = useProject();
    const { products } = useProducts(user?.id || '', storeId);
    const { categories } = useCategories(user?.id || '', storeId);
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
    const initialThemePresetId = useMemo<StorefrontThemePresetId>(() => {
        const projectPreset = project?.businessBlueprint?.storefrontBlueprint?.themePreset;
        if (isStorefrontThemePresetId(projectPreset)) return projectPreset;

        const pageBlueprint = isRecord(pageData.businessBlueprint) ? pageData.businessBlueprint : {};
        const storefrontBlueprint = isRecord(pageBlueprint.storefrontBlueprint) ? pageBlueprint.storefrontBlueprint : {};
        const nestedPreset = storefrontBlueprint.themePreset || storefrontBlueprint.templatePreset;
        return isStorefrontThemePresetId(nestedPreset) ? nestedPreset : 'minimal';
    }, [pageData.businessBlueprint, project?.businessBlueprint?.storefrontBlueprint?.themePreset]);
    const editorState = useMemo(
        () => (isRecord(pageData.storefrontEditor) ? pageData.storefrontEditor : {}),
        [projectContentSignature],
    );
    const draftEditorConfig = useMemo(
        () => resolveStorefrontEditorConfig(project, { mode: 'draft' }),
        [projectContentSignature],
    );
    const initialOrder = useMemo(
        () => resolveStorefrontEditorInitialOrder(project, { mode: 'draft' }),
        [projectContentSignature],
    );
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

    const [sections, setSections] = useState<StorefrontSectionKind[]>(initialOrder);
    const [visibility, setVisibility] = useState<Record<string, boolean>>({});
    const [sectionSettings, setSectionSettings] = useState<SectionSettingsMap>(initialSectionSettings);
    const [selectedSection, setSelectedSection] = useState<StorefrontSectionKind>(initialOrder[0] || defaultSections[0]);
    const [templateState, setTemplateState] = useState<TemplateState>(
        editorState.templateState === 'published' ? 'published' : 'draft'
    );
    const [selectedThemePresetId, setSelectedThemePresetId] = useState<StorefrontThemePresetId>(initialThemePresetId);
    const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
    const previewPayloadRef = useRef('');
    const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
    const sidebarSectionItemRefs = useRef<Partial<Record<StorefrontSectionKind, HTMLDivElement | null>>>({});
    const pendingPreviewSectionScrollRef = useRef<StorefrontSectionKind | null>(null);
    const previewSectionScrollTimeoutsRef = useRef<number[]>([]);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedStructurePanel, setSelectedStructurePanel] = useState<StorefrontStructurePanel | null>(
        initialOrder.length === 0 ? 'template' : null,
    );
    const [isStructureExpanded, setIsStructureExpanded] = useState(true);
    const [isContentExpanded, setIsContentExpanded] = useState(true);
    const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(true);
    const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);
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
        setSelectedStructurePanel(prev => (initialOrder.length === 0 && prev === null ? 'template' : prev));
        setTemplateState(editorState.templateState === 'published' ? 'published' : 'draft');
        setSelectedThemePresetId(initialThemePresetId);
    }, [
        editorState.templateState,
        initialThemePresetId,
        initialVisibility,
        initialOrder,
        initialOrderSignature,
        initialSectionSettings,
        initialSectionSettingsSignature,
        projectVisibilitySignature,
    ]);

    const previewStorefrontTheme = getStorefrontTheme();
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
    const defaultStorefrontName = t('ecommerce.storefrontEditor.defaultStoreName', 'Tienda');
    const translateStorefrontSelectOptions = useCallback((options: StorefrontEditorSelectOption[]) => (
        options.map(option => ({
            value: option.value,
            label: t(`ecommerce.storefrontEditor.optionLabels.${option.labelKey}`, option.fallback),
        }))
    ), [t]);
    const translatedStorefrontSelectOptions = useMemo(() => ({
        padding: translateStorefrontSelectOptions(storefrontSelectOptions.padding),
        productCardStyle: translateStorefrontSelectOptions(storefrontSelectOptions.productCardStyle),
        categoryCardStyle: translateStorefrontSelectOptions(storefrontSelectOptions.categoryCardStyle),
        trustBadgeVariant: translateStorefrontSelectOptions(storefrontSelectOptions.trustBadgeVariant),
        productReviewsVariant: translateStorefrontSelectOptions(storefrontSelectOptions.productReviewsVariant),
        productBundleVariant: translateStorefrontSelectOptions(storefrontSelectOptions.productBundleVariant),
        cardGap: translateStorefrontSelectOptions(storefrontSelectOptions.cardGap),
        aspectRatio: translateStorefrontSelectOptions(storefrontSelectOptions.aspectRatio),
        objectFit: translateStorefrontSelectOptions(storefrontSelectOptions.objectFit),
        alignment: translateStorefrontSelectOptions(storefrontSelectOptions.alignment),
        overlayStyle: translateStorefrontSelectOptions(storefrontSelectOptions.overlayStyle),
        visibleIn: translateStorefrontSelectOptions(storefrontSelectOptions.visibleIn),
        sourceType: translateStorefrontSelectOptions(storefrontSelectOptions.sourceType),
        heroLayout: translateStorefrontSelectOptions(storefrontSelectOptions.heroLayout),
        imageSize: translateStorefrontSelectOptions(storefrontSelectOptions.imageSize),
        iconSize: translateStorefrontSelectOptions(storefrontSelectOptions.iconSize),
    }), [translateStorefrontSelectOptions]);

    const setSidebarSectionItemRef = useCallback((section: StorefrontSectionKind, node: HTMLDivElement | null) => {
        if (node) {
            sidebarSectionItemRefs.current[section] = node;
            return;
        }

        delete sidebarSectionItemRefs.current[section];
    }, []);

    const scrollSidebarSectionIntoView = useCallback((section: StorefrontSectionKind) => {
        if (typeof window === 'undefined') return;

        const scrollToSidebarItem = (attempt = 0) => {
            window.requestAnimationFrame(() => {
                const target = sidebarSectionItemRefs.current[section];

                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                    });
                    return;
                }

                const nextDelay = SIDEBAR_SECTION_SCROLL_RETRY_DELAYS[attempt + 1];
                if (nextDelay !== undefined) {
                    window.setTimeout(() => scrollToSidebarItem(attempt + 1), nextDelay);
                }
            });
        };

        scrollToSidebarItem();
    }, []);

    const scrollPreviewSectionIntoView = useCallback((section: StorefrontSectionKind) => {
        if (typeof window === 'undefined') return;

        previewFrameRef.current?.contentWindow?.postMessage({
            type: STOREFRONT_EDITOR_SELECT_SECTION,
            sessionKey: previewSessionKey,
            projectId: storeId,
            section,
        }, window.location.origin);
    }, [previewSessionKey, storeId]);

    const clearScheduledPreviewSectionScrolls = useCallback(() => {
        if (typeof window === 'undefined') return;

        previewSectionScrollTimeoutsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId));
        previewSectionScrollTimeoutsRef.current = [];
    }, []);

    const schedulePreviewSectionScroll = useCallback((section: StorefrontSectionKind) => {
        if (typeof window === 'undefined') return;

        clearScheduledPreviewSectionScrolls();
        [0, 120, 320, 720].forEach(delay => {
            const timeoutId = window.setTimeout(() => {
                scrollPreviewSectionIntoView(section);
            }, delay);
            previewSectionScrollTimeoutsRef.current.push(timeoutId);
        });
    }, [clearScheduledPreviewSectionScrolls, scrollPreviewSectionIntoView]);

    const selectSectionForEditing = useCallback((
        section: StorefrontSectionKind,
        options: { scrollPreview?: boolean; scrollSidebar?: boolean } = {},
    ) => {
        const {
            scrollPreview = true,
            scrollSidebar = false,
        } = options;

        setSelectedSection(section);
        setSelectedStructurePanel(null);
        setIsControlsPanelOpen(true);
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
            setIsMobileControlsOpen(true);
        }
        setIsContentExpanded(true);

        if (scrollPreview) {
            pendingPreviewSectionScrollRef.current = section;
            schedulePreviewSectionScroll(section);
        }
        if (scrollSidebar) scrollSidebarSectionIntoView(section);
    }, [schedulePreviewSectionScroll, scrollSidebarSectionIntoView]);

    useEffect(() => () => {
        clearScheduledPreviewSectionScrolls();
    }, [clearScheduledPreviewSectionScrolls]);

    useEffect(() => {
        const pendingSection = pendingPreviewSectionScrollRef.current;
        if (!pendingSection || selectedSection !== pendingSection || !sections.includes(pendingSection)) return;

        schedulePreviewSectionScroll(pendingSection);
        pendingPreviewSectionScrollRef.current = null;
    }, [schedulePreviewSectionScroll, sections, selectedSection]);

    const getSectionLabel = (kind: StorefrontSectionKind) =>
        t(`ecommerce.storefrontEditor.sectionLabels.${kind}`, storefrontSectionRegistry[kind].label);

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
            templateState,
            String(editorState.updatedAt || projectLastUpdated || 'storefront-preview'),
            user?.id,
        ) || existingBusinessBlueprint;
        const previewStorefrontEditor = {
            ...(isRecord(pageData.storefrontEditor) ? pageData.storefrontEditor : {}),
            templateState,
            previewMode,
            sectionSettings: normalizedSettings,
            draft: buildStorefrontEditorSnapshot(
                sections,
                normalizedSettings,
                nextSectionVisibility,
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
            name: projectName || project?.name || settings?.storeName || defaultStorefrontName,
            header: buildPreviewHeader(project, pageData, previewStorefrontTheme),
            theme: buildPreviewTheme(project, previewStorefrontTheme),
            storefrontTheme: previewStorefrontTheme,
            data: nextPageData,
            componentOrder: nextComponentOrder,
            sectionVisibility: nextSectionVisibility,
            ...(previewBusinessBlueprint ? { businessBlueprint: previewBusinessBlueprint } : {}),
        };
    }, [
        defaultStorefrontName,
        pageData,
        previewMode,
        previewStorefrontTheme,
        project,
        projectId,
        projectName,
        sectionSettings,
        sections,
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

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handlePreviewSectionClick = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            const message = event.data;
            if (!message || message.type !== STOREFRONT_EDITOR_SECTION_CLICK) return;
            if (message.sessionKey !== previewSessionKey) return;
            const section = String(message.section);
            if (!isStorefrontKind(section)) return;

            selectSectionForEditing(section, {
                scrollPreview: false,
                scrollSidebar: true,
            });
        };

        window.addEventListener('message', handlePreviewSectionClick);
        return () => window.removeEventListener('message', handlePreviewSectionClick);
    }, [previewSessionKey, selectSectionForEditing]);

    const refreshPreview = () => {
        postPreviewPayload();
    };

    const markTemplateDirty = () => {
        setTemplateState(prev => prev === 'published' ? 'draft' : prev);
    };

    const applyThemePreset = async (value: string) => {
        if (!isStorefrontThemePresetId(value)) return;
        const preset = STOREFRONT_THEME_PRESETS[value];
        setSelectedThemePresetId(value);
        markTemplateDirty();
        setError(null);

        try {
            await replaceStorefrontTheme({
                ...previewStorefrontTheme,
                ...preset.theme,
            } as StorefrontThemeSettings);
        } catch (err: any) {
            setError(err.message || t('ecommerce.storefrontEditor.themePresetError', 'No se pudo aplicar el preset de tema.'));
        }
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
        setSections(prev => prev.includes(kind) ? prev : [...prev, kind]);
        setSectionSettings(prev => ({
            ...prev,
            [kind]: {
                ...storefrontSectionRegistry[kind].defaultSettings,
                ...toSettingsRecord(prev[kind]),
                enabled: true,
            },
        }));
        setVisibility(prev => ({ ...prev, [kind]: true }));
        selectSectionForEditing(kind);
        markTemplateDirty();
    };

    const removeSection = (kind: StorefrontSectionKind) => {
        const nextSections = sections.filter(section => section !== kind);

        setSections(nextSections);
        if (selectedSection === kind) {
            setSelectedSection(nextSections[0] || defaultSections[0]);
            setSelectedStructurePanel(nextSections.length === 0 ? 'template' : null);
        }
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
                nextState,
                now,
                user?.id,
                selectedThemePresetId,
            );
            const existingStorefrontEditor = isRecord(currentPageData.storefrontEditor)
                ? currentPageData.storefrontEditor
                : {};
            const draftSnapshot = buildStorefrontEditorSnapshot(
                sections,
                normalizedSettings,
                nextSectionVisibility,
                previewStorefrontTheme,
                now,
                'draft',
            );
            const publishedSnapshot = nextState === 'published'
                ? buildStorefrontEditorSnapshot(
                    sections,
                    normalizedSettings,
                    nextSectionVisibility,
                    previewStorefrontTheme,
                    now,
                    'published',
                )
                : (isRecord(existingStorefrontEditor.published) ? existingStorefrontEditor.published : undefined);
            const nextStorefrontEditor = {
                ...existingStorefrontEditor,
                templateState: nextState,
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
                    name: projectName || project.name || settings?.storeName || defaultStorefrontName,
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
            <div className="rounded-[var(--editor-control-radius)] border border-q-border bg-q-surface p-6 text-sm text-q-text-muted">
                {t('ecommerce.storefrontEditor.noProject', 'Selecciona un proyecto para editar su storefront.')}
            </div>
        );
    }

    const isBusy = isSavingTemplate || settingsSaving;
    const previewDisplayName = settings?.storeName || projectName || project.name || defaultStorefrontName;

    const selectStructurePanel = (panel: StorefrontStructurePanel) => {
        setSelectedStructurePanel(panel);
        setIsControlsPanelOpen(true);
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
            setIsMobileControlsOpen(true);
        }
    };

    const activeEditorLabel = selectedStructurePanel === 'template'
        ? t('ecommerce.storefrontEditor.templateState', 'Estado')
        : getSectionLabel(selectedSection);
    const ActiveEditorIcon = selectedStructurePanel === 'template'
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
                                onItemRef={setSidebarSectionItemRef}
                            />
                        );
                    })}
                </div>
            </SortableContext>
        </DndContext>
    );

    const renderTemplateControls = () => (
        <div data-editor-controls-surface="storefront-template" className="space-y-4">
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
                            ? 'bg-q-success/15 text-q-success'
                            : 'bg-q-accent/15 text-q-accent'
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
            <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                    <Palette size={14} />
                    {t('ecommerce.storefrontEditor.themeSettings', 'Tema')}
                </label>
                <Select
                    label={t('ecommerce.storefrontEditor.themePreset', 'Preset')}
                    value={selectedThemePresetId}
                    onChange={applyThemePreset}
                    options={(Object.values(STOREFRONT_THEME_PRESETS)).map(preset => ({
                        value: preset.id,
                        label: preset.label,
                    }))}
                    noMargin
                />
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
        const supportsDescriptionTypography = !['announcementBar', 'trustBadges'].includes(selectedSection);
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
        const variantOptions = selectedSection === 'trustBadges'
            ? translatedStorefrontSelectOptions.trustBadgeVariant
            : selectedSection === 'productReviews'
                ? translatedStorefrontSelectOptions.productReviewsVariant
                : selectedSection === 'productBundle'
                    ? translatedStorefrontSelectOptions.productBundleVariant
                    : validVariants.map(variant => ({
                        value: variant,
                        label: t(`ecommerce.storefrontEditor.optionLabels.variant.${variant}`, variant),
                    }));
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
        const selectedProductIds = normalizeIdList(selectedSectionSettings.productIds);
        const selectedHeroProductId = String(selectedSectionSettings.productId || '');
        const selectedCollectionSlug = String(selectedSectionSettings.collectionId || '');
        const updateSelectedProductIds = (nextIds: string[]) => {
            updateSelectedSectionSetting('productIds', nextIds);
            if (selectedSection === 'featuredProducts') {
                updateSelectedSectionSetting('sourceType', 'manual');
                updateSelectedSectionSetting('productsToShow', Math.max(getSettingNumber(selectedSectionSettings, 'productsToShow', countFallback), nextIds.length || countFallback));
            }
        };

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
                            <p key={message} className="rounded-md bg-q-error/10 px-2 py-1 text-xs text-q-error">
                                {translateValidationMessage(message)}
                            </p>
                        ))}
                        {selectedSectionValidation.warnings.map(message => (
                            <p key={message} className="rounded-md bg-q-accent/10 px-2 py-1 text-xs text-q-accent">
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
                            options={variantOptions}
                            noMargin
                        />
                    )}

                    <Select
                        label={t('ecommerce.storefrontEditor.visibleIn', 'Visible en')}
                        value={String(selectedSectionSettings.visibleIn || 'both')}
                        onChange={value => updateSelectedSectionSetting('visibleIn', value)}
                        options={translatedStorefrontSelectOptions.visibleIn}
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
                    <>
                        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                            <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                                <Box size={14} />
                                {t('ecommerce.storefrontEditor.productSource', 'Fuente de productos')}
                            </label>
                            <Select
                                label={t('ecommerce.storefrontEditor.sourceType', 'Fuente')}
                                value={String(selectedSectionSettings.sourceType || 'newest')}
                                onChange={value => updateSelectedSectionSetting('sourceType', value)}
                                options={translatedStorefrontSelectOptions.sourceType}
                                noMargin
                            />
                        </div>
                        <StorefrontProductChooser
                            products={products}
                            selectedIds={selectedProductIds}
                            mode="multiple"
                            title={t('ecommerce.storefrontEditor.chooseProducts', 'Escoger productos')}
                            description={t('ecommerce.storefrontEditor.chooseProductsHint', 'Selecciona productos reales de la tienda. Al escogerlos, la fuente cambia a Manual.')}
                            searchPlaceholder={t('ecommerce.storefrontEditor.searchProducts', 'Buscar productos...')}
                            emptyLabel={t('ecommerce.storefrontEditor.noProductsForChooser', 'No hay productos en esta tienda todavía. Crea productos en Ecommerce Admin.')}
                            noMatchesLabel={t('ecommerce.storefrontEditor.noProductMatches', 'No encontramos productos con esa búsqueda.')}
                            selectedLabel={t('ecommerce.storefrontEditor.productsSelected', 'productos seleccionados')}
                            clearLabel={t('common.clear', 'Limpiar')}
                            notFoundLabel={t('ecommerce.storefrontEditor.productIdsNotFound', 'Estos IDs guardados no están en la tienda actual.')}
                            onChange={updateSelectedProductIds}
                        />
                    </>
                )}

                {(selectedSection === 'saleCountdown' || selectedSection === 'productBundle') && (
                    <StorefrontProductChooser
                        products={products}
                        selectedIds={selectedProductIds}
                        mode="multiple"
                        title={t('ecommerce.storefrontEditor.chooseProducts', 'Escoger productos')}
                        description={t('ecommerce.storefrontEditor.chooseProductsNoAdminHint', 'Selecciona productos reales para este componente. La edición de precio, inventario y producto sigue en Ecommerce Admin.')}
                        searchPlaceholder={t('ecommerce.storefrontEditor.searchProducts', 'Buscar productos...')}
                        emptyLabel={t('ecommerce.storefrontEditor.noProductsForChooser', 'No hay productos en esta tienda todavía. Crea productos en Ecommerce Admin.')}
                        noMatchesLabel={t('ecommerce.storefrontEditor.noProductMatches', 'No encontramos productos con esa búsqueda.')}
                        selectedLabel={t('ecommerce.storefrontEditor.productsSelected', 'productos seleccionados')}
                        clearLabel={t('common.clear', 'Limpiar')}
                        notFoundLabel={t('ecommerce.storefrontEditor.productIdsNotFound', 'Estos IDs guardados no están en la tienda actual.')}
                        onChange={updateSelectedProductIds}
                    />
                )}

                {selectedSection === 'productHero' && (
                    <StorefrontProductChooser
                        products={products}
                        selectedIds={selectedHeroProductId ? [selectedHeroProductId] : []}
                        mode="single"
                        title={t('ecommerce.storefrontEditor.chooseHeroProduct', 'Producto del hero')}
                        description={t('ecommerce.storefrontEditor.chooseHeroProductHint', 'Escoge el producto real que se mostrará en el hero. Si lo dejas vacío, se usará el primer producto disponible.')}
                        searchPlaceholder={t('ecommerce.storefrontEditor.searchProducts', 'Buscar productos...')}
                        emptyLabel={t('ecommerce.storefrontEditor.noProductsForChooser', 'No hay productos en esta tienda todavía. Crea productos en Ecommerce Admin.')}
                        noMatchesLabel={t('ecommerce.storefrontEditor.noProductMatches', 'No encontramos productos con esa búsqueda.')}
                        selectedLabel={t('ecommerce.storefrontEditor.productsSelected', 'productos seleccionados')}
                        clearLabel={t('common.clear', 'Limpiar')}
                        notFoundLabel={t('ecommerce.storefrontEditor.productIdsNotFound', 'Estos IDs guardados no están en la tienda actual.')}
                        onChange={nextIds => updateSelectedSectionSetting('productId', nextIds[0] || '')}
                    />
                )}

                {selectedSection === 'collectionBanner' && (
                    <StorefrontCategoryChooser
                        categories={categories}
                        selectedValue={selectedCollectionSlug}
                        title={t('ecommerce.storefrontEditor.chooseCollection', 'Colección del banner')}
                        description={t('ecommerce.storefrontEditor.chooseCollectionHint', 'Escoge una categoría real de la tienda. El banner navegará a esa página de categoría.')}
                        searchPlaceholder={t('ecommerce.storefrontEditor.searchCollections', 'Buscar categorías...')}
                        emptyLabel={t('ecommerce.storefrontEditor.noCollectionsForChooser', 'No hay categorías en esta tienda todavía. Crea categorías en Ecommerce Admin.')}
                        noMatchesLabel={t('ecommerce.storefrontEditor.noCollectionMatches', 'No encontramos categorías con esa búsqueda.')}
                        clearLabel={t('common.clear', 'Limpiar')}
                        onChange={value => updateSelectedSectionSetting('collectionId', value)}
                    />
                )}

                {supportsHeroControls && (
                    <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
                        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={14} />
                            {t('ecommerce.storefrontEditor.ctaAndTarget', 'CTA y destino')}
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
                    {supportsDescriptionTypography && (
                        <FontSizeSelector
                            label={t('ecommerce.storefrontEditor.descriptionSize', 'Tamaño de descripción')}
                            value={String(
                                selectedSection === 'productHero'
                                    ? selectedSectionSettings.subheadlineFontSize || 'md'
                                    : selectedSectionSettings.descriptionFontSize || 'md',
                            )}
                            onChange={value => {
                                if (selectedSection === 'productHero') {
                                    updateSelectedSectionSetting('subheadlineFontSize', value);
                                    return;
                                }

                                updateSelectedSectionSetting('descriptionFontSize', value);
                            }}
                        />
                    )}
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
                                    options={translatedStorefrontSelectOptions.heroLayout}
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.imageSize', 'Tamaño de imagen')}
                                    value={String(selectedSectionSettings.imageSize || 'medium')}
                                    onChange={value => updateSelectedSectionSetting('imageSize', value)}
                                    options={translatedStorefrontSelectOptions.imageSize}
                                />
                            </>
                        )}
                        <Select
                            label={t('ecommerce.storefrontEditor.contentPosition', 'Posición de contenido')}
                            value={String(selectedSectionSettings.contentPosition || 'center')}
                            onChange={value => updateSelectedSectionSetting('contentPosition', value)}
                            options={translatedStorefrontSelectOptions.alignment}
                        />
                        <Select
                            label={t('ecommerce.storefrontEditor.textAlignment', 'Alineación de texto')}
                            value={String(selectedSectionSettings.textAlignment || 'center')}
                            onChange={value => updateSelectedSectionSetting('textAlignment', value)}
                            options={translatedStorefrontSelectOptions.alignment}
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
                                    options={translatedStorefrontSelectOptions.productCardStyle}
                                    noMargin
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.cardAspectRatio', 'Proporción de tarjeta')}
                                    value={String(selectedSectionSettings.cardAspectRatio || '4:5')}
                                    onChange={value => updateSelectedSectionSetting('cardAspectRatio', value)}
                                    options={translatedStorefrontSelectOptions.aspectRatio}
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.imageFit', 'Ajuste de imagen')}
                                    value={String(selectedSectionSettings.imageObjectFit || 'cover')}
                                    onChange={value => updateSelectedSectionSetting('imageObjectFit', value)}
                                    options={translatedStorefrontSelectOptions.objectFit}
                                />
                            </>
                        )}
                        {supportsCardGap && (
                            <Select
                                label={t('ecommerce.storefrontEditor.cardGap', 'Separación')}
                                value={String(selectedSectionSettings.cardGap || 'md')}
                                onChange={value => updateSelectedSectionSetting('cardGap', value)}
                                options={translatedStorefrontSelectOptions.cardGap}
                            />
                        )}
                        {selectedSection === 'trustBadges' && (
                            <Select
                                label={t('ecommerce.storefrontEditor.iconSize', 'Tamaño de icono')}
                                value={String(selectedSectionSettings.iconSize || 'md')}
                                onChange={value => updateSelectedSectionSetting('iconSize', value)}
                                options={translatedStorefrontSelectOptions.iconSize}
                            />
                        )}
                        {selectedSection === 'categoryGrid' && (
                            <>
                                <Select
                                    label={t('ecommerce.storefrontEditor.categoryCardStyle', 'Diseño de categoría')}
                                    value={String(selectedSectionSettings.variant || 'overlay')}
                                    onChange={value => updateSelectedSectionSetting('variant', value)}
                                    options={translatedStorefrontSelectOptions.categoryCardStyle}
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.imageRatio', 'Proporción de imagen')}
                                    value={String(selectedSectionSettings.imageAspectRatio || '1:1')}
                                    onChange={value => updateSelectedSectionSetting('imageAspectRatio', value)}
                                    options={translatedStorefrontSelectOptions.aspectRatio}
                                />
                                <Select
                                    label={t('ecommerce.storefrontEditor.imageFit', 'Ajuste de imagen')}
                                    value={String(selectedSectionSettings.imageObjectFit || 'cover')}
                                    onChange={value => updateSelectedSectionSetting('imageObjectFit', value)}
                                    options={translatedStorefrontSelectOptions.objectFit}
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
                            options={translatedStorefrontSelectOptions.overlayStyle}
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
        return renderSectionControls();
    };

    return (
        <div data-storefront-editor-shell className="-m-3 flex h-[calc(100dvh-7rem)] min-h-0 flex-col overflow-hidden bg-q-bg sm:-m-6 md:min-h-[720px] lg:-m-8">
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
                    <span className={`hidden rounded-[var(--editor-control-radius)] px-2.5 py-1 text-xs font-semibold md:inline-flex ${
                        templateState === 'published'
                            ? 'bg-q-success/15 text-q-success'
                            : 'bg-q-accent/15 text-q-accent'
                    }`}>
                        {templateState === 'published'
                            ? t('common.published', 'Publicado')
                            : t('common.draft', 'Borrador')}
                    </span>
                </div>

                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 rounded-[var(--editor-control-radius)] bg-secondary/50 p-1">
                        {([
                            ['desktop', Monitor, t('ecommerce.storefrontEditor.desktop', 'Escritorio')],
                            ['tablet', Tablet, t('ecommerce.storefrontEditor.tablet', 'Tablet')],
                            ['mobile', Smartphone, t('ecommerce.storefrontEditor.mobile', 'Móvil')],
                        ] as const).map(([mode, Icon, label]) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setPreviewMode(mode)}
                                className={`flex items-center gap-2 rounded-[var(--editor-control-radius-sm)] px-3 py-1.5 text-sm font-medium transition-all ${
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
                        onClick={() => setIsMobileControlsOpen(true)}
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--editor-control-radius)] text-q-text-muted transition-colors hover:bg-secondary/50 hover:text-foreground md:hidden"
                        aria-label={t('ecommerce.storefrontEditor.openControls', 'Abrir controles')}
                        title={t('ecommerce.storefrontEditor.openControls', 'Abrir controles')}
                    >
                        <SlidersHorizontal size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={refreshPreview}
                        className="flex h-9 w-9 items-center justify-center rounded-[var(--editor-control-radius)] text-q-text-muted transition-colors hover:bg-secondary/50 hover:text-foreground"
                        aria-label={t('ecommerce.storefrontEditor.refreshPreview', 'Actualizar preview')}
                        title={t('ecommerce.storefrontEditor.refreshPreview', 'Actualizar preview')}
                    >
                        <RefreshCw size={16} />
                    </button>
                    <a
                        href={storefrontUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hidden h-9 items-center justify-center gap-2 rounded-[var(--editor-control-radius)] px-3 text-sm font-medium text-q-text-muted transition-colors hover:bg-secondary/50 hover:text-foreground sm:inline-flex"
                    >
                        <ExternalLink size={16} />
                        <span>{t('ecommerce.storefrontEditor.openStorefront', 'Abrir tienda')}</span>
                    </a>
                    <button
                        type="button"
                        onClick={() => saveTemplate('draft')}
                        disabled={isBusy}
                        className="flex h-9 items-center justify-center gap-2 rounded-[var(--editor-control-radius)] px-3 text-sm font-medium text-q-text-muted transition-colors hover:bg-secondary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSavingTemplate ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        <span className="hidden sm:inline">{t('common.save', 'Guardar')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => saveTemplate('published')}
                        disabled={isBusy}
                        className="quimera-guide-cta flex h-9 items-center justify-center gap-2 rounded-[var(--editor-control-radius)] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CheckCircle2 size={16} />
                        <span className="hidden sm:inline">{t('ecommerce.storefrontEditor.publishTemplate', 'Publicar')}</span>
                    </button>
                </div>
            </header>

            {(statusMessage || error) && (
                <div className={`z-20 flex flex-shrink-0 items-center gap-2 border-b px-4 py-2 text-sm ${
                    error
                        ? 'border-q-error/30 bg-q-error/10 text-q-error'
                        : 'border-q-success/30 bg-q-success/10 text-q-success'
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
                            className="flex h-10 w-full items-center justify-between rounded-[var(--editor-control-radius)] border border-q-border bg-q-bg px-3 text-left text-sm font-medium text-foreground"
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
                            className="flex h-7 w-7 items-center justify-center rounded-[var(--q-radius-md)] text-q-accent transition-colors hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))]"
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
                                className="flex w-full items-center gap-2 rounded-[var(--q-radius-md)] px-2 py-2 text-xs font-bold uppercase tracking-wider text-q-accent transition-all hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))]"
                            >
                                <ChevronDown size={14} className={`transition-transform ${isStructureExpanded ? '' : '-rotate-90'}`} />
                                <Settings size={14} />
                                <span>{t('landingEditor.structure', 'ESTRUCTURA')}</span>
                                <span className="text-q-text-muted">(1)</span>
                            </button>

                            {isStructureExpanded && (
                                <div className="mt-1 space-y-0.5 pl-2">
                                    {([
                                        ['template', LayoutTemplate, t('ecommerce.storefrontEditor.templateState', 'Estado')],
                                    ] as const).map(([panel, Icon, label]) => (
                                        <button
                                            key={panel}
                                            type="button"
                                            onClick={() => selectStructurePanel(panel)}
                                            className={`flex w-full cursor-pointer items-center gap-2 rounded-[var(--q-radius-md)] border p-2.5 text-left transition-all ${
                                                selectedStructurePanel === panel
                                                    ? 'border-q-accent bg-q-accent text-q-text-on-accent shadow-[var(--shadow-card)] dark:bg-q-accent/10 dark:text-q-accent dark:border-q-accent/30 dark:shadow-none black:bg-q-accent/10 black:text-q-accent black:border-q-accent/30 black:shadow-none'
                                                    : 'border-transparent hover:border-structure-control-border hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))]'
                                            }`}
                                        >
                                            <Icon size={16} className={selectedStructurePanel === panel ? 'flex-shrink-0 text-q-text-on-accent dark:text-q-accent black:text-q-accent' : 'flex-shrink-0 text-q-text-muted'} />
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
                                className="flex w-full items-center gap-2 rounded-[var(--q-radius-md)] px-2 py-2 text-xs font-bold uppercase tracking-wider text-q-accent transition-all hover:bg-structure-control-hover hover:text-q-text hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))]"
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
                                            className="flex w-full items-center justify-between rounded-[var(--q-radius-md)] border border-q-border bg-q-bg/40 px-3 py-2 text-left text-sm text-foreground transition-all hover:border-structure-control-border hover:bg-structure-control-hover hover:shadow-[inset_0_0_0_1px_hsl(var(--structure-control-border))]"
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
                        className="mx-auto flex h-full w-full flex-col overflow-hidden rounded-[var(--editor-control-modal-radius)] border border-q-border bg-q-surface shadow-2xl transition-all duration-300"
                        style={{
                            width: previewWidths[previewMode],
                            maxWidth: '100%',
                        }}
                    >
                        <div className="flex h-11 flex-shrink-0 items-center border-b border-q-border bg-q-bg px-4">
                            <div className="flex gap-2">
                                <span className="h-3 w-3 rounded-full bg-q-error" />
                                <span className="h-3 w-3 rounded-full bg-q-accent" />
                                <span className="h-3 w-3 rounded-full bg-q-success" />
                            </div>
                            <div className="flex flex-1 items-center justify-center px-4">
                                <div className="flex w-full max-w-md items-center justify-center truncate rounded-[var(--editor-control-radius)] border border-q-border/50 bg-secondary/50 px-4 py-1 text-center text-xs text-q-text-muted sm:text-sm">
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
                            onLoad={() => {
                                postPreviewPayload();
                                schedulePreviewSectionScroll(selectedSection);
                            }}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            scrolling="yes"
                            className="h-full min-h-0 flex-1 border-0 bg-q-surface"
                        />
                    </div>
                </section>

                <button
                    type="button"
                    onClick={() => setIsControlsPanelOpen(prev => !prev)}
                    className={`absolute top-1/2 z-30 hidden -translate-y-1/2 overflow-hidden rounded-[var(--editor-control-radius)] border border-q-border bg-q-surface p-2 shadow-lg transition-all duration-300 hover:bg-accent md:block ${
                        isControlsPanelOpen
                            ? 'right-[calc(20rem-18px)] lg:right-[calc(24rem-18px)]'
                            : 'right-0 rounded-r-none'
                    }`}
                    title={isControlsPanelOpen ? t('common.hide', 'Ocultar') : t('common.show', 'Mostrar')}
                >
                    {isControlsPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>

                <aside data-editor-controls-surface="storefront" className={`${isControlsPanelOpen ? 'w-80 lg:w-96' : 'w-0'} editor-theme hidden flex-shrink-0 flex-col overflow-hidden border-l border-q-border bg-q-bg transition-all duration-300 md:flex`}>
                    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-q-border px-4">
                        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-q-text">
                            <ActiveEditorIcon size={16} className="flex-shrink-0 text-q-accent" />
                            <span className="truncate">
                                {t('landingEditor.edit', 'Editar')}: {activeEditorLabel}
                            </span>
                        </h3>
                    </div>
                    <div data-editor-controls-scroll className="quimera-clean-controls min-h-0 flex-1 overflow-y-auto p-4">
                        {renderActiveControls()}
                    </div>
                </aside>
            </main>

            <MobileBottomSheet
                isOpen={isMobileControlsOpen}
                onClose={() => setIsMobileControlsOpen(false)}
                title={activeEditorLabel}
                subtitle={t('landingEditor.edit', 'Editar')}
            >
                <div className="flex max-h-[75vh] min-h-[520px] min-w-0 flex-col overflow-hidden">
                    <div className="flex-shrink-0 border-b border-q-border p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-q-text-muted">
                                {t('landingEditor.pageStructure', 'ESTRUCTURA DE PÁGINA')}
                            </p>
                            <button
                                type="button"
                                onClick={applySectionPreset}
                                className="flex h-8 w-8 items-center justify-center rounded-[var(--q-radius-md)] text-q-accent transition-colors hover:bg-structure-control-hover hover:text-q-text"
                                title={t('ecommerce.storefrontEditor.showAllSections', 'Mostrar todos los componentes')}
                            >
                                <Plus size={15} />
                            </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto pr-1">
                            <button
                                type="button"
                                onClick={() => selectStructurePanel('template')}
                                className={`mb-1 flex w-full items-center gap-2 rounded-[var(--q-radius-md)] border p-2.5 text-left transition-all ${
                                    selectedStructurePanel === 'template'
                                        ? 'border-q-accent bg-q-accent text-q-text-on-accent shadow-[var(--shadow-card)] dark:bg-q-accent/10 dark:text-q-accent dark:border-q-accent/30 dark:shadow-none black:bg-q-accent/10 black:text-q-accent black:border-q-accent/30 black:shadow-none'
                                        : 'border-transparent hover:border-structure-control-border hover:bg-structure-control-hover hover:text-q-text'
                                }`}
                            >
                                <LayoutTemplate size={16} className="flex-shrink-0" />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                    {t('ecommerce.storefrontEditor.templateState', 'Estado')}
                                </span>
                            </button>
                            {renderSortableSectionList('space-y-1')}
                        </div>
                    </div>
                    <div data-editor-controls-surface="storefront-mobile" className="quimera-clean-controls min-h-0 flex-1 overflow-y-auto p-4">
                        {renderActiveControls()}
                    </div>
                </div>
            </MobileBottomSheet>
        </div>
    );
};

export default StorefrontEditorView;
