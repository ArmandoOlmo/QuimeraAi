import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, Plus, Trash2 } from 'lucide-react';
import type {
    SectionVisualBackgroundConfig,
    SectionVisualBackgroundMode,
    SectionVisualFocusArea,
    SectionVisualFocusAreaType,
} from '../../types/components';
import ColorControl from './ColorControl';
import { Select, SliderControl, ToggleControl } from './EditorControlPrimitives';

interface VisualBackgroundControlProps {
    sectionKey: string;
    sectionData?: Record<string, any> | null;
    setNestedData: (path: string, value: any) => void;
    title?: string;
    className?: string;
}

const getColor = (
    visual: Partial<SectionVisualBackgroundConfig>,
    key: keyof SectionVisualBackgroundConfig,
    fallback: string,
): string => {
    const value = visual[key];
    return typeof value === 'string' ? value : fallback;
};

const getNumber = (
    visual: Partial<SectionVisualBackgroundConfig>,
    key: keyof SectionVisualBackgroundConfig,
    fallback: number,
): number => {
    const value = visual[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const FOCUS_GRID_COLUMNS = 5;
const FOCUS_GRID_ROWS = 5;
const FOCUS_AREA_TYPES: SectionVisualFocusAreaType[] = ['radial', 'spotlight', 'wash', 'beam'];

const clampPercent = (value: number | undefined, fallback: number): number => {
    const nextValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.max(0, Math.min(100, Math.round(nextValue)));
};

const createFocusAreaId = () => `focus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const normalizeFocusAreas = (value: unknown): SectionVisualFocusArea[] => {
    if (!Array.isArray(value)) return [];

    return value
        .filter((area): area is Record<string, unknown> => (
            typeof area === 'object' && area !== null && !Array.isArray(area)
        ))
        .map((area, index) => ({
            id: typeof area.id === 'string' ? area.id : `focus-${index + 1}`,
            type: FOCUS_AREA_TYPES.includes(area.type as SectionVisualFocusAreaType)
                ? area.type as SectionVisualFocusAreaType
                : 'radial',
            x: clampPercent(typeof area.x === 'number' ? area.x : undefined, 50),
            y: clampPercent(typeof area.y === 'number' ? area.y : undefined, 50),
            color: typeof area.color === 'string' ? area.color : undefined,
            opacity: clampPercent(typeof area.opacity === 'number' ? area.opacity : undefined, 35),
            size: clampPercent(typeof area.size === 'number' ? area.size : undefined, 58),
            softness: clampPercent(typeof area.softness === 'number' ? area.softness : undefined, 45),
        }));
};

const getFocusAreaFallback = (
    visual: Partial<SectionVisualBackgroundConfig>,
    accentFallback: string,
): SectionVisualFocusArea => ({
    id: 'focus-legacy',
    type: 'radial',
    x: 50,
    y: 50,
    color: getColor(visual, 'focusColor', accentFallback),
    opacity: getNumber(visual, 'focusOpacity', 35),
    size: 58,
    softness: 45,
});

interface FocusAreasControlProps {
    visual: Partial<SectionVisualBackgroundConfig>;
    backgroundFallback: string;
    accentFallback: string;
    onChange: (areas: SectionVisualFocusArea[]) => void;
}

const FocusAreasControl: React.FC<FocusAreasControlProps> = ({
    visual,
    backgroundFallback,
    accentFallback,
    onChange,
}) => {
    const { t } = useTranslation();
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
    const hasConfiguredFocusAreas = Array.isArray(visual.focusAreas);
    const savedAreas = useMemo(() => normalizeFocusAreas(visual.focusAreas), [visual.focusAreas]);
    const legacyArea = useMemo(() => getFocusAreaFallback(visual, accentFallback), [visual, accentFallback]);
    const areas = hasConfiguredFocusAreas ? savedAreas : [legacyArea];
    const selectedIndex = selectedAreaId
        ? areas.findIndex(area => area.id === selectedAreaId)
        : -1;
    const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const activeArea = areas[activeIndex];
    const focusTypeOptions = [
        { value: 'radial', label: t('editor.controls.visualBackground.focusTypeRadial', 'Punto') },
        { value: 'spotlight', label: t('editor.controls.visualBackground.focusTypeSpotlight', 'Spotlight') },
        { value: 'wash', label: t('editor.controls.visualBackground.focusTypeWash', 'Wash') },
        { value: 'beam', label: t('editor.controls.visualBackground.focusTypeBeam', 'Beam') },
    ];

    const commitAreas = (nextAreas: SectionVisualFocusArea[]) => {
        onChange(nextAreas.map((area, index) => ({
            id: area.id || `focus-${index + 1}`,
            type: area.type || 'radial',
            x: clampPercent(area.x, 50),
            y: clampPercent(area.y, 50),
            color: area.color || accentFallback,
            opacity: clampPercent(area.opacity, 35),
            size: clampPercent(area.size, 58),
            softness: clampPercent(area.softness, 45),
        })));
    };

    const addFocusArea = (x = 50, y = 50) => {
        const nextArea: SectionVisualFocusArea = {
            id: createFocusAreaId(),
            type: 'radial',
            x,
            y,
            color: accentFallback,
            opacity: getNumber(visual, 'focusOpacity', 35),
            size: 58,
            softness: 45,
        };
        const baseAreas = hasConfiguredFocusAreas ? savedAreas : areas;
        const nextAreas = [...baseAreas, nextArea];
        commitAreas(nextAreas);
        setSelectedAreaId(nextArea.id || null);
    };

    const updateActiveArea = (patch: Partial<SectionVisualFocusArea>) => {
        if (!activeArea) return;
        const nextAreas = areas.map((area, index) => {
            if (index !== activeIndex) return area;
            return {
                ...area,
                id: area.id || createFocusAreaId(),
                ...patch,
            };
        });
        commitAreas(nextAreas);
        setSelectedAreaId(nextAreas[activeIndex]?.id || null);
    };

    const removeActiveArea = () => {
        if (!activeArea) return;
        const nextAreas = areas.filter((_, index) => index !== activeIndex);
        commitAreas(nextAreas);
        setSelectedAreaId(nextAreas[Math.max(0, activeIndex - 1)]?.id || null);
    };

    const gridCells = Array.from({ length: FOCUS_GRID_COLUMNS * FOCUS_GRID_ROWS }, (_, index) => {
        const column = index % FOCUS_GRID_COLUMNS;
        const row = Math.floor(index / FOCUS_GRID_COLUMNS);
        return {
            id: `${column}-${row}`,
            x: Math.round((column / (FOCUS_GRID_COLUMNS - 1)) * 100),
            y: Math.round((row / (FOCUS_GRID_ROWS - 1)) * 100),
        };
    });

    return (
        <div className="space-y-3 rounded-md border border-q-border/70 bg-q-surface/50 p-3">
            <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                    {t('editor.controls.visualBackground.focusAreas', 'Areas de foco')}
                </label>
                <button
                    type="button"
                    onClick={() => addFocusArea()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-q-border bg-q-bg px-2.5 py-1.5 text-xs font-semibold text-q-text hover:border-q-accent hover:text-q-accent transition-colors"
                >
                    <Plus size={13} />
                    {t('common.add', 'Agregar')}
                </button>
            </div>

            <div
                className="relative aspect-[5/3] overflow-hidden rounded-md border border-q-border bg-q-bg"
                style={{ backgroundColor: backgroundFallback }}
            >
                <div className="absolute inset-0 grid grid-cols-5 grid-rows-5">
                    {gridCells.map(cell => (
                        <button
                            key={cell.id}
                            type="button"
                            onClick={() => {
                                if (activeArea) updateActiveArea({ x: cell.x, y: cell.y });
                                else addFocusArea(cell.x, cell.y);
                            }}
                            className="border border-q-border/30 hover:bg-q-accent/10 focus:outline-none focus:ring-1 focus:ring-q-accent"
                            aria-label={t('editor.controls.visualBackground.placeFocusArea', 'Colocar area de foco')}
                        />
                    ))}
                </div>
                {areas.map((area, index) => (
                    <button
                        key={area.id || index}
                        type="button"
                        onClick={() => setSelectedAreaId(area.id || null)}
                        className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm transition-transform ${
                            index === activeIndex
                                ? 'scale-125 border-q-accent bg-q-accent'
                                : 'border-white bg-q-text-muted'
                        }`}
                        style={{
                            left: `${clampPercent(area.x, 50)}%`,
                            top: `${clampPercent(area.y, 50)}%`,
                            backgroundColor: area.color || accentFallback,
                        }}
                        aria-label={`${t('editor.controls.visualBackground.focusArea', 'Area de foco')} ${index + 1}`}
                    />
                ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {areas.map((area, index) => (
                    <button
                        key={area.id || index}
                        type="button"
                        onClick={() => setSelectedAreaId(area.id || null)}
                        className={`flex min-h-9 items-center gap-2 rounded-md border px-2 text-left text-xs transition-colors ${
                            index === activeIndex
                                ? 'border-q-accent bg-q-accent/10 text-q-text'
                                : 'border-q-border bg-q-bg text-q-text-secondary hover:text-q-text'
                        }`}
                    >
                        <span
                            className="h-3 w-3 rounded-full border border-q-border"
                            style={{ backgroundColor: area.color || accentFallback }}
                        />
                        <span className="truncate">
                            {t('editor.controls.visualBackground.focusArea', 'Area de foco')} {index + 1}
                        </span>
                    </button>
                ))}
            </div>

            {activeArea && (
                <div className="space-y-3 rounded-md border border-q-border/60 bg-q-bg/70 p-3">
                    <Select
                        label={t('editor.controls.visualBackground.focusType', 'Tipo de enfoque')}
                        value={activeArea.type || 'radial'}
                        options={focusTypeOptions}
                        onChange={(value) => updateActiveArea({ type: value as SectionVisualFocusAreaType })}
                    />
                    <ColorControl
                        label={t('editor.controls.visualBackground.focusAreaColor', 'Color del enfoque')}
                        value={activeArea.color || accentFallback}
                        onChange={(value) => updateActiveArea({ color: value })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <SliderControl
                            label="X"
                            value={clampPercent(activeArea.x, 50)}
                            min={0}
                            max={100}
                            step={5}
                            suffix="%"
                            onChange={(value) => updateActiveArea({ x: value })}
                        />
                        <SliderControl
                            label="Y"
                            value={clampPercent(activeArea.y, 50)}
                            min={0}
                            max={100}
                            step={5}
                            suffix="%"
                            onChange={(value) => updateActiveArea({ y: value })}
                        />
                    </div>
                    <SliderControl
                        label={t('editor.controls.visualBackground.focusOpacity', 'Opacidad del foco')}
                        value={clampPercent(activeArea.opacity, 35)}
                        min={0}
                        max={100}
                        step={5}
                        suffix="%"
                        className="mb-3"
                        onChange={(value) => updateActiveArea({ opacity: value })}
                    />
                    <SliderControl
                        label={t('editor.controls.visualBackground.focusSize', 'Tamano del foco')}
                        value={clampPercent(activeArea.size, 58)}
                        min={10}
                        max={100}
                        step={5}
                        suffix="%"
                        className="mb-3"
                        onChange={(value) => updateActiveArea({ size: value })}
                    />
                    <SliderControl
                        label={t('editor.controls.visualBackground.focusSoftness', 'Suavidad')}
                        value={clampPercent(activeArea.softness, 45)}
                        min={0}
                        max={100}
                        step={5}
                        suffix="%"
                        className="mb-3"
                        onChange={(value) => updateActiveArea({ softness: value })}
                    />
                    <button
                        type="button"
                        onClick={removeActiveArea}
                        className="inline-flex items-center gap-1.5 rounded-md border border-q-border px-2.5 py-1.5 text-xs font-semibold text-q-text-muted hover:border-q-error/50 hover:text-q-error transition-colors"
                    >
                        <Trash2 size={13} />
                        {t('common.remove', 'Eliminar')}
                    </button>
                </div>
            )}
        </div>
    );
};

const VisualBackgroundControl: React.FC<VisualBackgroundControlProps> = ({
    sectionKey,
    sectionData,
    setNestedData,
    title,
    className,
}) => {
    const { t } = useTranslation();
    const visual = (sectionData?.backgroundVisual || {}) as Partial<SectionVisualBackgroundConfig>;
    const enabled = visual.enabled === true;
    const mode = (visual.mode || 'solid') as SectionVisualBackgroundMode;
    const colors = sectionData?.colors || {};
    const backgroundFallback = colors.background || sectionData?.backgroundColor || '#ffffff';
    const accentFallback = colors.accent || colors.primary || sectionData?.accentColor || '#fbbf24';
    const updateVisual = (key: keyof SectionVisualBackgroundConfig, value: any) => {
        setNestedData(`${sectionKey}.backgroundVisual.${key}`, value);
    };

    return (
        <div className={`rounded-lg border border-q-border bg-q-surface/40 p-3 space-y-3 ${className || ''}`}>
            <h5 className="text-xs font-bold text-q-accent uppercase tracking-wider flex items-center gap-2">
                <Palette size={14} />
                {title || t('editor.controls.visualBackground.title', 'Fondo visual')}
            </h5>
            <ToggleControl
                label={t('editor.controls.visualBackground.enabled', 'Activar fondo visual')}
                checked={enabled}
                onChange={(value) => updateVisual('enabled', value)}
            />

            {enabled && (
                <div className="space-y-3 rounded-md border border-q-border/70 bg-q-bg/60 p-3">
                    <Select
                        label={t('editor.controls.visualBackground.mode', 'Modo de fondo')}
                        value={mode}
                        options={[
                            { value: 'solid', label: t('editor.controls.visualBackground.modeSolid', 'Sólido') },
                            { value: 'gradient', label: t('editor.controls.visualBackground.modeGradient', 'Gradiente') },
                            { value: 'focus', label: t('editor.controls.visualBackground.modeFocus', 'Foco') },
                        ]}
                        onChange={(value) => updateVisual('mode', value as SectionVisualBackgroundMode)}
                    />

                    {mode === 'solid' && (
                        <ColorControl
                            label={t('editor.controls.visualBackground.solidColor', 'Color sólido')}
                            value={getColor(visual, 'solidColor', backgroundFallback)}
                            onChange={(value) => updateVisual('solidColor', value)}
                        />
                    )}

                    {(mode === 'gradient' || mode === 'focus') && (
                        <ColorControl
                            label={t('editor.controls.visualBackground.gradientBaseColor', 'Color base del gradiente')}
                            value={getColor(visual, 'gradientBaseColor', backgroundFallback)}
                            onChange={(value) => updateVisual('gradientBaseColor', value)}
                        />
                    )}

                    {mode === 'gradient' && (
                        <>
                            <ColorControl
                                label={t('editor.controls.visualBackground.gradientPrimaryColor', 'Color primario del gradiente')}
                                value={getColor(visual, 'gradientPrimaryColor', accentFallback)}
                                onChange={(value) => updateVisual('gradientPrimaryColor', value)}
                            />
                            <ColorControl
                                label={t('editor.controls.visualBackground.gradientSecondaryColor', 'Color secundario del gradiente')}
                                value={getColor(visual, 'gradientSecondaryColor', '#e0f2fe')}
                                onChange={(value) => updateVisual('gradientSecondaryColor', value)}
                            />
                            <ColorControl
                                label={t('editor.controls.visualBackground.gradientAccentColor', 'Color de acento del gradiente')}
                                value={getColor(visual, 'gradientAccentColor', '#c7d2fe')}
                                onChange={(value) => updateVisual('gradientAccentColor', value)}
                            />
                            <ColorControl
                                label={t('editor.controls.visualBackground.gradientBottomColor', 'Color inferior del gradiente')}
                                value={getColor(visual, 'gradientBottomColor', backgroundFallback)}
                                onChange={(value) => updateVisual('gradientBottomColor', value)}
                            />
                        </>
                    )}

                    {mode === 'focus' && (
                        <FocusAreasControl
                            visual={visual}
                            backgroundFallback={backgroundFallback}
                            accentFallback={accentFallback}
                            onChange={(areas) => updateVisual('focusAreas', areas)}
                        />
                    )}

                    {(mode === 'gradient' || mode === 'focus') && (
                        <SliderControl
                            label={t('editor.controls.visualBackground.intensity', 'Intensidad')}
                            value={getNumber(visual, 'intensity', 55)}
                            min={0}
                            max={100}
                            step={5}
                            suffix="%"
                            className="mb-3"
                            onChange={(value) => updateVisual('intensity', value)}
                        />
                    )}

                    <ColorControl
                        label={t('editor.controls.visualBackground.overlayColor', 'Color de overlay')}
                        value={getColor(visual, 'overlayColor', '#000000')}
                        onChange={(value) => updateVisual('overlayColor', value)}
                    />
                    <SliderControl
                        label={t('editor.controls.visualBackground.overlayOpacity', 'Opacidad del overlay')}
                        value={getNumber(visual, 'overlayOpacity', 0)}
                        min={0}
                        max={100}
                        step={5}
                        suffix="%"
                        onChange={(value) => updateVisual('overlayOpacity', value)}
                    />
                </div>
            )}
        </div>
    );
};

export default VisualBackgroundControl;
