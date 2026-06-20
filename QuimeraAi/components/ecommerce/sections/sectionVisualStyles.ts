import type { CSSProperties } from 'react';
import type { CornerGradientConfig, SectionBackgroundFields } from '../../../types/components';

type SectionVisualData = SectionBackgroundFields & {
    cornerGradient?: Partial<CornerGradientConfig>;
    height?: number;
};

const isHexColor = (value?: string): boolean =>
    !!value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);

const hexToRgba = (color: string, alpha: number): string => {
    if (!isHexColor(color)) return color;
    const hex = color.length === 4
        ? color.slice(1).split('').map(char => char + char).join('')
        : color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    const alpha = Math.max(0, Math.min(1, opacity));
    return isHexColor(safeColor) ? hexToRgba(safeColor, alpha) : safeColor;
};

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

    return `linear-gradient(${direction}, ${hexToRgba(color, opacity)} 0%, transparent ${size}%)`;
};

const getImageOverlayLayer = (data: SectionVisualData): string | undefined => {
    if (!data.backgroundImageUrl || data.backgroundOverlayEnabled === false) return undefined;

    const overlayColor = data.backgroundOverlayColor || '#000000';
    const opacity = Math.max(0, Math.min(100, data.backgroundOverlayOpacity ?? 45)) / 100;
    const overlay = isHexColor(overlayColor)
        ? hexToRgba(overlayColor, opacity)
        : overlayColor;

    return `linear-gradient(0deg, ${overlay}, ${overlay})`;
};

export const getStorefrontSectionBackgroundStyle = (
    data: SectionVisualData,
    backgroundColor?: string,
): CSSProperties => {
    const layers = [
        getCornerGradientLayer(data.cornerGradient),
        getImageOverlayLayer(data),
        data.backgroundImageUrl ? `url(${data.backgroundImageUrl})` : undefined,
    ].filter(Boolean);

    return {
        backgroundColor,
        ...(typeof data.height === 'number' && Number.isFinite(data.height) && data.height > 0
            ? { minHeight: `${data.height}px` }
            : {}),
        ...(layers.length > 0 ? {
            backgroundImage: layers.join(', '),
            backgroundPosition: data.backgroundImageUrl
                ? [data.cornerGradient?.enabled ? 'center center' : undefined, data.backgroundImageUrl && data.backgroundOverlayEnabled !== false ? 'center center' : undefined, data.backgroundPosition || 'center center'].filter(Boolean).join(', ')
                : undefined,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
        } : {}),
    };
};
