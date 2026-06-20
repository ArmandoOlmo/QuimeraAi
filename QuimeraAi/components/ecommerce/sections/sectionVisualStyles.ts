import type { CSSProperties } from 'react';
import type { CornerGradientConfig, SectionBackgroundFields } from '../../../types/components';

type SectionVisualData = SectionBackgroundFields & {
    cornerGradient?: Partial<CornerGradientConfig>;
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
