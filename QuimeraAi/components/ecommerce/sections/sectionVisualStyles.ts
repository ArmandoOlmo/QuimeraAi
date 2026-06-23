import type { CSSProperties } from 'react';
import type { CornerGradientConfig, SectionBackgroundFields, SectionVisualBackgroundConfig, SectionVisualFocusArea } from '../../../types/components';

type SectionVisualData = SectionBackgroundFields & {
    cornerGradient?: Partial<CornerGradientConfig>;
    height?: number;
    glassEffect?: boolean;
};

type BackgroundLayer = {
    image: string;
    position?: string;
    repeat?: string;
    size?: string;
};

const isHexColor = (value?: string): boolean =>
    !!value && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);

const hexToRgba = (color: string, alpha: number): string => {
    if (!isHexColor(color)) return color;
    const hex = color.length === 4
        ? color.slice(1).split('').map(char => char + char).join('')
        : color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const sourceAlpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r}, ${g}, ${b}, ${Number((sourceAlpha * alpha).toFixed(3))})`;
};

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const parseRgbColor = (value: string): { r: number; g: number; b: number; alpha: number } | undefined => {
    const match = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (!match) return undefined;

    return {
        r: clamp(Math.round(Number(match[1])), 0, 255),
        g: clamp(Math.round(Number(match[2])), 0, 255),
        b: clamp(Math.round(Number(match[3])), 0, 255),
        alpha: match[4] === undefined ? 1 : clamp(Number(match[4]), 0, 1),
    };
};

const colorWithOpacity = (color: string, opacity: number): string => {
    const safeOpacity = clamp(opacity, 0, 1);
    if (isHexColor(color)) return hexToRgba(color, safeOpacity);

    const rgb = parseRgbColor(color);
    if (rgb) {
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number((rgb.alpha * safeOpacity).toFixed(3))})`;
    }

    return color;
};

export const getStorefrontPaddingYClass = (value?: string, fallback = 'md'): string => {
    const map: Record<string, string> = {
        none: 'py-0',
        sm: 'py-4',
        md: 'py-8',
        lg: 'py-12',
        xl: 'py-16',
    };
    return map[value || fallback] || map[fallback] || map.md;
};

export const getStorefrontPaddingXClass = (value?: string, fallback = 'md'): string => {
    const map: Record<string, string> = {
        none: 'px-0',
        sm: 'px-4',
        md: 'px-6',
        lg: 'px-8',
        xl: 'px-12',
    };
    return map[value || fallback] || map[fallback] || map.md;
};

export const getStorefrontRadiusClass = (value?: string, fallback = 'xl'): string => {
    const map: Record<string, string> = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        full: 'rounded-full',
    };
    return map[value || fallback] || map[fallback] || map.xl;
};

export const getStorefrontCardGapClass = (value?: string, fallback = 'md'): string => {
    const map: Record<string, string> = {
        sm: 'gap-3',
        md: 'gap-4 md:gap-6',
        lg: 'gap-6 md:gap-8',
        xl: 'gap-8 md:gap-10',
    };
    return map[value || fallback] || map[fallback] || map.md;
};

export const getStorefrontCardGapPx = (value?: string, fallback = 'md'): number => {
    const map: Record<string, number> = {
        sm: 12,
        md: 24,
        lg: 32,
        xl: 40,
    };
    return map[value || fallback] || map[fallback] || map.md;
};

export const getStorefrontAspectRatioClass = (value?: string, fallback = '1:1'): string => {
    const map: Record<string, string> = {
        auto: 'aspect-auto',
        '1:1': 'aspect-square',
        '4:3': 'aspect-[4/3]',
        '3:4': 'aspect-[3/4]',
        '4:5': 'aspect-[4/5]',
        '16:9': 'aspect-video',
        '9:16': 'aspect-[9/16]',
    };
    return map[value || fallback] || map[fallback] || map['1:1'];
};

export const getStorefrontColumnsClass = (columns?: number, fallback = 4): string => {
    switch (columns || fallback) {
        case 2: return 'sm:grid-cols-2';
        case 3: return 'sm:grid-cols-2 lg:grid-cols-3';
        case 5: return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
        case 6: return 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';
        default: return 'sm:grid-cols-2 lg:grid-cols-4';
    }
};

export const getStorefrontTextAlignmentClass = (value?: string, fallback = 'center'): string => {
    const map: Record<string, string> = {
        left: 'items-start text-left',
        center: 'items-center text-center',
        right: 'items-end text-right',
    };
    return map[value || fallback] || map[fallback] || map.center;
};

export const getStorefrontContentPositionClass = (value?: string, fallback = 'center'): string => {
    const map: Record<string, string> = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
    };
    return map[value || fallback] || map[fallback] || map.center;
};

export const getStorefrontColorWithOpacity = (color: string | undefined, opacity: number, fallback = '#000000'): string => {
    const safeColor = color || fallback;
    return colorWithOpacity(safeColor, opacity);
};

export const getStorefrontOverlayGradient = (
    overlayStart?: string,
    overlayEnd?: string,
    mid = 'rgba(0,0,0,0.34)',
): string => (
    `linear-gradient(to top, ${overlayEnd || 'rgba(0,0,0,0.82)'} 0%, ${mid} 58%, ${overlayStart || 'transparent'} 100%)`
);

export const getStorefrontOverlayBackground = (
    overlayStyle: unknown,
    overlayColor: string | undefined,
    overlayOpacity: number | undefined,
): string => {
    if (overlayStyle === 'none') return 'transparent';

    const opacity = Math.max(0, Math.min(100, overlayOpacity ?? 55)) / 100;
    if (overlayStyle === 'solid') {
        return getStorefrontColorWithOpacity(overlayColor, opacity);
    }

    return `linear-gradient(to bottom, ${getStorefrontColorWithOpacity(overlayColor, opacity)} 0%, ${getStorefrontColorWithOpacity(overlayColor, opacity * 0.32)} 100%)`;
};

const getCornerGradientLayer = (cornerGradient?: Partial<CornerGradientConfig>): string | undefined => {
    if (!cornerGradient?.enabled || cornerGradient.position === 'none') return undefined;

    const directionByPosition: Record<string, string> = {
        'top-left': 'to bottom right',
        'top-right': 'to bottom left',
        'bottom-left': 'to top right',
        'bottom-right': 'to top left',
    };
    const direction = directionByPosition[cornerGradient.position || 'top-right'] || directionByPosition['top-right'];
    const color = cornerGradient.color || '#fbbf24';
    const opacity = Math.max(0, Math.min(100, cornerGradient.opacity ?? 35)) / 100;
    const size = Math.max(10, Math.min(100, cornerGradient.size ?? 45));

    return `linear-gradient(${direction}, ${getStorefrontColorWithOpacity(color, opacity, '#fbbf24')} 0%, transparent ${size}%)`;
};

const isFocusArea = (value: unknown): value is Partial<SectionVisualFocusArea> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const getFocusAreaLayer = (
    area: Partial<SectionVisualFocusArea>,
    visual: Partial<SectionVisualBackgroundConfig>,
    fallbackColor: string,
): string => {
    const x = clamp(area.x ?? 50, 0, 100);
    const y = clamp(area.y ?? 50, 0, 100);
    const opacity = clamp((area.opacity ?? visual.focusOpacity ?? 35) / 100, 0, 1);
    const size = clamp(area.size ?? 58, 10, 120);
    const softness = clamp((area.softness ?? 45) / 100, 0, 1);
    const color = area.color || visual.focusColor || fallbackColor;
    const solid = getStorefrontColorWithOpacity(color, opacity, fallbackColor);
    const soft = getStorefrontColorWithOpacity(color, opacity * (0.2 + softness * 0.35), fallbackColor);
    const coreStop = clamp(size * (0.08 + (1 - softness) * 0.16), 4, 28);
    const midStop = clamp(size * (0.28 + softness * 0.22), coreStop + 6, 78);

    switch (area.type || 'radial') {
        case 'spotlight':
            return `radial-gradient(ellipse ${size}% ${clamp(size * 0.62, 18, 88)}% at ${x}% ${y}%, ${solid} 0%, ${soft} ${midStop}%, transparent ${size}%)`;
        case 'wash':
            return `radial-gradient(circle at ${x}% ${y}%, ${soft} 0%, ${soft} ${midStop}%, transparent ${clamp(size + 18, 28, 130)}%)`;
        case 'beam':
            return `radial-gradient(ellipse ${clamp(size * 1.45, 28, 140)}% ${clamp(size * 0.22, 8, 34)}% at ${x}% ${y}%, ${solid} 0%, ${soft} ${midStop}%, transparent ${clamp(size + 8, 24, 128)}%)`;
        case 'radial':
        default:
            return `radial-gradient(circle at ${x}% ${y}%, ${solid} 0%, ${soft} ${midStop}%, transparent ${size}%)`;
    }
};

const getVisualBackground = (
    data: SectionVisualData,
    backgroundColor?: string,
): { backgroundColor?: string; layers: BackgroundLayer[] } => {
    const visual = data.backgroundVisual as Partial<SectionVisualBackgroundConfig> | undefined;
    if (!visual?.enabled) return { backgroundColor, layers: [] };

    const mode = visual.mode || 'solid';
    const baseColor = visual.gradientBaseColor || visual.solidColor || backgroundColor || '#ffffff';
    const intensity = clamp((visual.intensity ?? 55) / 100, 0, 1);
    const overlayOpacity = clamp((visual.overlayOpacity ?? 0) / 100, 0, 1);
    const focusOpacity = clamp((visual.focusOpacity ?? 35) / 100, 0, 1);
    const layers: BackgroundLayer[] = [];

    if (overlayOpacity > 0) {
        const overlay = getStorefrontColorWithOpacity(visual.overlayColor, overlayOpacity, '#000000');
        layers.push({
            image: `linear-gradient(0deg, ${overlay}, ${overlay})`,
        });
    }

    if (mode === 'gradient') {
        const primary = getStorefrontColorWithOpacity(visual.gradientPrimaryColor, intensity, '#f8fafc');
        const secondary = getStorefrontColorWithOpacity(visual.gradientSecondaryColor, intensity, '#e0f2fe');
        const accent = getStorefrontColorWithOpacity(visual.gradientAccentColor, intensity, '#c7d2fe');
        const bottom = getStorefrontColorWithOpacity(visual.gradientBottomColor, Math.max(0.18, intensity), baseColor);

        layers.push({
            image: `linear-gradient(135deg, ${primary} 0%, ${secondary} 42%, ${accent} 68%, ${bottom} 100%)`,
        });
    }

    if (mode === 'focus') {
        const hasConfiguredFocusAreas = Array.isArray(visual.focusAreas);
        const focusAreas = hasConfiguredFocusAreas
            ? visual.focusAreas?.filter(isFocusArea) || []
            : [];

        if (focusAreas.length > 0) {
            focusAreas.forEach(area => {
                layers.push({
                    image: getFocusAreaLayer(area, visual, '#fbbf24'),
                });
            });
        } else if (!hasConfiguredFocusAreas) {
            const focus = getStorefrontColorWithOpacity(visual.focusColor, focusOpacity, '#fbbf24');
            const focusSoft = getStorefrontColorWithOpacity(visual.focusColor, focusOpacity * 0.35, '#fbbf24');
            const outerStop = clamp(48 + (intensity * 34), 48, 82);

            layers.push({
                image: `radial-gradient(circle at ${data.backgroundPosition || 'center center'}, ${focus} 0%, ${focusSoft} 28%, transparent ${outerStop}%)`,
            });
        }
    }

    return {
        backgroundColor: mode === 'solid'
            ? (visual.solidColor || backgroundColor)
            : baseColor,
        layers,
    };
};

const getImageOverlayLayer = (data: SectionVisualData): string | undefined => {
    if (!data.backgroundImageUrl || data.backgroundOverlayEnabled === false) return undefined;

    const overlayColor = data.backgroundOverlayColor || '#000000';
    const opacity = Math.max(0, Math.min(100, data.backgroundOverlayOpacity ?? 45)) / 100;
    const overlay = getStorefrontColorWithOpacity(overlayColor, opacity, '#000000');

    return `linear-gradient(0deg, ${overlay}, ${overlay})`;
};

export const getStorefrontSectionBackgroundStyle = (
    data: SectionVisualData,
    backgroundColor?: string,
): CSSProperties => {
    const visualBackground = getVisualBackground(data, backgroundColor);
    const cornerGradientLayer = getCornerGradientLayer(data.cornerGradient);
    const imageOverlayLayer = getImageOverlayLayer(data);
    const layers = [
        ...visualBackground.layers,
        ...(cornerGradientLayer
            ? [{ image: cornerGradientLayer }]
            : []),
        ...(imageOverlayLayer
            ? [{ image: imageOverlayLayer, position: 'center center' }]
            : []),
        ...(data.backgroundImageUrl
            ? [{ image: `url(${data.backgroundImageUrl})`, position: data.backgroundPosition || 'center center' }]
            : []),
    ];

    const resolvedBackgroundColor = visualBackground.backgroundColor || backgroundColor;
    const effectiveBackgroundColor = data.glassEffect
        ? getStorefrontColorWithOpacity(resolvedBackgroundColor, 0.82, resolvedBackgroundColor || '#ffffff')
        : resolvedBackgroundColor;

    return {
        backgroundColor: effectiveBackgroundColor,
        ...(typeof data.height === 'number' && Number.isFinite(data.height) && data.height > 0
            ? { minHeight: `${data.height}px` }
            : {}),
        ...(data.glassEffect ? {
            backdropFilter: 'blur(18px) saturate(1.35)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.35)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        } : {}),
        ...(layers.length > 0 ? {
            backgroundImage: layers.map(layer => layer.image).join(', '),
            backgroundPosition: layers.map(layer => layer.position || 'center center').join(', '),
            backgroundRepeat: layers.map(layer => layer.repeat || 'no-repeat').join(', '),
            backgroundSize: layers.map(layer => layer.size || 'cover').join(', '),
        } : {}),
    };
};
