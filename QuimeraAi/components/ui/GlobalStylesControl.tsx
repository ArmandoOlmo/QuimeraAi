/**
 * GlobalStylesControl - Control global de estilos
 * Puede mostrar solo colores, solo tipografía, o ambos (con tabs)
 *
 * Al seleccionar una paleta predefinida, los colores se aplican a TODOS los componentes.
 * Luego el usuario puede personalizar colores individualmente por componente.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../../contexts/admin/AdminContext';
import { useProject } from '../../contexts/project/ProjectContext';
import { FontFamily, GlobalColors, PageData } from '../../types';
import type { ColorCandidate } from '../../types/colorSystem';
import ColorControl from './ColorControl';
import CoolorsImporter from './CoolorsImporter';
import { colorPalettes, ColorPalette, getDefaultGlobalColors } from '../../data/colorPalettes';
import { hexToRgba } from '../../utils/colorUtils';
import { createColorBriefFromTheme, generateColorCandidates, toGlobalColors } from '../../utils/colorSystemEngine';
import { fontOptions, fontStacks, formatFontName, getFontStack, loadAllFonts, resolveFontFamily } from '../../utils/fontLoader';
import { Type, Palette, Check, Sparkles, Grid, RotateCcw, Info, Loader2, Upload, ChevronDown } from 'lucide-react';
import FontFamilyPicker from './FontFamilyPicker';
import FontWeightPicker from './FontWeightPicker';

export type GlobalStylesMode = 'colors' | 'typography' | 'both';



type Tab = 'typography' | 'colors';

interface GlobalStylesControlProps {
    mode?: GlobalStylesMode;
}

const normalizeGlobalColors = (colors?: Partial<GlobalColors>): GlobalColors => ({
    ...getDefaultGlobalColors(),
    ...(colors || {}),
});

const getWebsitePaletteColors = (colors: GlobalColors): string[] => Array.from(new Set([
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.background,
    colors.surface,
    colors.text,
    colors.heading,
    colors.textMuted,
    colors.border,
    colors.success,
    colors.error,
].filter(Boolean)));

const getGenericComponentColorMapping = (colors: GlobalColors): Record<string, string> => ({
    background: colors.background,
    heading: colors.heading,
    text: colors.text,
    textMuted: colors.textMuted,
    accent: colors.accent,
    borderColor: colors.border,
    cardBackground: colors.surface,
    cardText: readableTextOn(colors.surface, colors.text),
    buttonBackground: colors.primary,
    buttonText: readableTextOn(colors.primary),
});

const NON_VISUAL_DATA_KEYS = new Set(['colors', 'typography']);

/**
 * Calcula la luminancia relativa de un color hex y devuelve el texto que mejor contrasta.
 * Usado para garantizar legibilidad WCAG AA en botones, cards, y overlays.
 */
export const contrastText = (bgHex: string, lightColor = '#ffffff', darkColor = '#1a1a1a'): string => {
    try {
        const hex = (bgHex || '#000000').replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        // sRGB luminance formula
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luminance > 0.45 ? darkColor : lightColor;
    } catch {
        return lightColor;
    }
};

const normalizeHexForContrast = (value?: string): string | null => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    const short = /^#([0-9a-f]{3})$/i.exec(trimmed);
    if (short) {
        return `#${short[1].split('').map(char => char + char).join('').toLowerCase()}`;
    }
    const long = /^#([0-9a-f]{6})$/i.exec(trimmed);
    return long ? `#${long[1].toLowerCase()}` : null;
};

const srgbToLinear = (channel: number): number => (
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
);

const relativeLuminance = (color?: string): number | null => {
    const hex = normalizeHexForContrast(color);
    if (!hex) return null;
    const r = srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255);
    const g = srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255);
    const b = srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const colorContrastRatio = (foreground?: string, background?: string): number => {
    const fg = relativeLuminance(foreground);
    const bg = relativeLuminance(background);
    if (fg === null || bg === null) return 1;
    const lighter = Math.max(fg, bg);
    const darker = Math.min(fg, bg);
    return (lighter + 0.05) / (darker + 0.05);
};

export const readableTextOn = (
    background?: string,
    preferred?: string,
    fallbackLight = '#ffffff',
    fallbackDark = '#1a1a1a',
): string => {
    if (preferred && normalizeHexForContrast(preferred) && colorContrastRatio(preferred, background) >= 4.5) {
        return preferred;
    }
    const candidates = [preferred, fallbackLight, fallbackDark]
        .filter((candidate): candidate is string => Boolean(normalizeHexForContrast(candidate)));
    if (!normalizeHexForContrast(background)) return candidates[0] || fallbackLight;

    const sorted = candidates.sort((a, b) => colorContrastRatio(b, background) - colorContrastRatio(a, background));
    return sorted[0] || contrastText(background || '#000000', fallbackLight, fallbackDark);
};

const readableMutedTextOn = (background?: string, preferred?: string): string => {
    if (preferred && colorContrastRatio(preferred, background) >= 3) return preferred;
    const base = readableTextOn(background, preferred);
    return base;
};

const getReadableRoles = (colors: GlobalColors) => {
    const backgroundText = readableTextOn(colors.background, colors.text);
    const backgroundHeading = readableTextOn(colors.background, colors.heading || colors.text);
    const surfaceText = readableTextOn(colors.surface, colors.text);
    const surfaceHeading = readableTextOn(colors.surface, colors.heading || colors.text);
    const primaryText = readableTextOn(colors.primary);
    const secondaryText = readableTextOn(colors.secondary);
    const accentText = readableTextOn(colors.accent);
    const errorText = readableTextOn(colors.error);
    const successText = readableTextOn(colors.success);

    return {
        backgroundText,
        backgroundHeading,
        backgroundMuted: readableMutedTextOn(colors.background, colors.textMuted),
        surfaceText,
        surfaceHeading,
        surfaceMuted: readableMutedTextOn(colors.surface, colors.textMuted),
        primaryText,
        secondaryText,
        accentText,
        errorText,
        successText,
    };
};

/**
 * Genera el mapeo de colores de la paleta global a cada componente
 * Exportado para uso en onboarding y otras partes de la aplicación
 */
export const generateComponentColorMappings = (colors: GlobalColors): Record<string, Record<string, string>> => {
    const readable = getReadableRoles(colors);

    return {
        hero: {
            primary: colors?.primary,
            secondary: colors?.secondary,
            background: colors?.background,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            secondaryButtonBackground: colors?.surface,
            secondaryButtonText: readable.surfaceHeading,
        },
        heroSplit: {
            textBackground: colors?.background,
            imageBackground: colors?.surface,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        banner: {
            background: colors?.surface,
            overlayColor: colors?.background,
            heading: readable.surfaceHeading,
            text: readable.surfaceText,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        map: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            borderColor: colors?.border,
        },
        features: {
            background: colors?.background,
            accent: colors?.accent,
            borderColor: colors?.border,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            description: readable.backgroundText,
            cardBackground: colors?.surface,
            cardHeading: readable.surfaceHeading,
            cardText: readable.surfaceText,
        },
        testimonials: {
            background: colors?.surface,
            accent: colors?.accent,
            borderColor: colors?.border,
            text: readable.surfaceText,
            heading: readable.surfaceHeading,
            description: readable.surfaceText,
            subtitleColor: readable.surfaceMuted,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
        },
        cta: {
            background: colors?.background,
            gradientStart: colors?.primary,
            gradientEnd: colors?.secondary,
            text: readable.backgroundHeading,
            heading: readable.backgroundHeading,
            description: readable.backgroundText,
            buttonBackground: colors?.background,
            buttonText: readable.backgroundHeading,
        },
        services: {
            background: colors?.surface,
            accent: colors?.accent,
            borderColor: colors?.border,
            text: readable.surfaceText,
            heading: readable.surfaceHeading,
            description: readable.surfaceText,
            cardBackground: colors?.surface,
            cardHeading: readable.surfaceHeading,
            cardText: readable.surfaceText,
        },
        team: {
            background: colors?.background,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            photoBorderColor: colors?.primary,
        },
        slideshow: {
            background: colors?.surface,
            heading: readable.surfaceHeading,
            arrowBackground: hexToRgba(colors?.background, 0.5),
            arrowText: readable.backgroundHeading,
            dotActive: readable.surfaceHeading,
            dotInactive: hexToRgba(readable.surfaceHeading, 0.5),
            captionBackground: hexToRgba(colors?.background, 0.8),
            captionText: readable.backgroundText,
        },
        pricing: {
            background: colors?.background,
            accent: colors?.accent,
            borderColor: colors?.border,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            gradientStart: colors?.primary,
            gradientEnd: colors?.secondary,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
        },
        faq: {
            background: colors?.surface,
            accent: colors?.accent,
            borderColor: colors?.border,
            text: readable.surfaceText,
            heading: readable.surfaceHeading,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            gradientStart: colors?.primary,
            gradientEnd: colors?.secondary,
        },
        portfolio: {
            background: colors?.background,
            accent: colors?.accent,
            borderColor: colors?.border,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            cardBackground: hexToRgba(colors?.background, 0.9),
            cardTitleColor: readable.backgroundHeading,
            cardTextColor: hexToRgba(readable.backgroundText, 0.9),
            cardOverlayStart: hexToRgba(colors?.background, 0.95),
            cardOverlayEnd: hexToRgba(colors?.background, 0.3),
        },
        leads: {
            background: colors?.background,
            accent: colors?.accent,
            borderColor: colors?.border,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            inputBackground: colors?.background,
            inputText: readable.backgroundHeading,
            inputBorder: colors?.border,
            gradientStart: colors?.primary,
            gradientEnd: colors?.secondary,
        },
        realEstateListings: {
            background: colors?.background,
            surface: colors?.surface,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            textMuted: readable.backgroundMuted,
            primary: colors?.primary,
            secondary: colors?.secondary,
            accent: colors?.primary,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            border: colors?.border,
            borderColor: colors?.border,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            badgeBackground: colors?.accent,
            badgeText: readable.accentText,
            priceColor: colors?.accent,
            success: colors?.success,
            error: colors?.error,
        },
        newsletter: {
            background: colors?.surface,
            accent: colors?.accent,
            borderColor: colors?.border,
            text: readable.surfaceText,
            heading: readable.surfaceHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            cardBackground: colors?.surface,
            inputBackground: colors?.background,
            inputText: readable.backgroundHeading,
            inputBorder: colors?.border,
        },
        video: {
            background: colors?.surface,
            text: readable.surfaceText,
            heading: readable.surfaceHeading,
        },
        howItWorks: {
            background: colors?.background,
            accent: colors?.accent,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
        },
        footer: {
            background: colors?.surface,
            border: colors?.border,
            text: readable.surfaceMuted,
            linkHover: colors?.primary,
            heading: readable.surfaceHeading,
        },
        header: {
            background: colors?.primary,
            text: readable.primaryText,
            accent: readable.primaryText,
            border: 'transparent',
            buttonBackground: colors?.secondary,
            buttonText: readable.secondaryText,
        },
        menu: {
            background: colors?.background,
            accent: colors?.accent,
            borderColor: colors?.border,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            cardBackground: colors?.surface,
            cardTitleColor: readable.surfaceHeading,
            cardText: readable.surfaceText,
            priceColor: colors?.accent,
        },
        chatbot: {
            // Core colors
            primaryColor: colors?.primary,
            secondaryColor: colors?.secondary,
            accentColor: colors?.accent,
            // Chat bubbles
            userBubbleColor: colors?.primary,
            userTextColor: readable.primaryText,
            botBubbleColor: colors?.surface,
            botTextColor: readable.surfaceText,
            // Background and inputs
            backgroundColor: colors?.background,
            inputBackground: colors?.surface,
            inputBorder: colors?.border,
            inputText: readable.surfaceText,
            // Header
            headerBackground: colors?.primary,
            headerText: readable.primaryText,
        },
        // Ecommerce components
        featuredProducts: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            badgeBackground: colors?.primary,
            badgeText: readable.primaryText,
            priceColor: readable.surfaceHeading,
            salePriceColor: colors?.error,
            overlayStart: 'transparent',
            overlayEnd: hexToRgba(colors?.background, 0.7),
            borderColor: colors?.border,
        },
        categoryGrid: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            overlayStart: 'transparent',
            overlayEnd: hexToRgba(colors?.background, 0.7),
            borderColor: colors?.border,
        },
        productHero: {
            background: colors?.background,
            overlayColor: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            badgeBackground: colors?.error,
            badgeText: readable.errorText,
        },
        trustBadges: {
            background: colors?.surface,
            heading: readable.surfaceHeading,
            text: readable.surfaceText,
            accent: colors?.accent,
            borderColor: colors?.border,
        },
        saleCountdown: {
            background: colors?.surface,
            heading: readable.surfaceHeading,
            text: readable.surfaceText,
            accent: colors?.error,
            countdownBackground: colors?.background,
            countdownText: readable.backgroundHeading,
            buttonBackground: colors?.error,
            buttonText: readable.errorText,
            badgeBackground: colors?.error,
            badgeText: readable.errorText,
        },
        announcementBar: {
            background: colors?.primary,
            text: readable.primaryText,
            linkColor: readable.primaryText,
            iconColor: readable.primaryText,
            borderColor: colors?.border,
        },
        collectionBanner: {
            background: colors?.background,
            overlayColor: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        recentlyViewed: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
        },
        productReviews: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            starColor: '#fbbf24',
            verifiedBadgeColor: colors?.success,
        },
        productBundle: {
            background: colors?.surface,
            heading: readable.surfaceHeading,
            text: readable.surfaceText,
            accent: colors?.accent,
            cardBackground: colors?.background,
            cardText: readable.backgroundText,
            cardHeading: readable.backgroundHeading,
            priceColor: readable.backgroundHeading,
            savingsColor: colors?.success,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            badgeBackground: colors?.primary,
            badgeText: readable.primaryText,
        },
        storeSettings: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            badgeBackground: colors?.error,
            badgeText: readable.errorText,
            priceColor: readable.surfaceHeading,
            salePriceColor: colors?.error,
            borderColor: colors?.border,
            starColor: '#fbbf24',
        },
        // Products grid component
        products: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        productDetailPage: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            badgeBackground: colors?.error,
            badgeText: readable.errorText,
            priceColor: readable.surfaceHeading,
            salePriceColor: colors?.error,
            borderColor: colors?.border,
            starColor: '#fbbf24',
            linkColor: colors?.primary,
            secondaryButtonBackground: colors?.surface,
            secondaryButtonText: readable.surfaceText,
        },
        // ── New component mappings (topBar, logoBanner, signupFloat, cmsFeed, hero variants, screenshotCarousel) ──
        topBar: {
            background: colors?.primary,
            text: readable.primaryText,
            linkColor: readable.primaryText,
            iconColor: readable.primaryText,
            borderColor: colors?.border,
        },
        logoBanner: {
            background: colors?.background,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            accent: colors?.accent,
            borderColor: colors?.border,
        },
        signupFloat: {
            background: colors?.primary,
            text: readable.primaryText,
            heading: readable.primaryText,
            buttonBackground: colors?.secondary,
            buttonText: readable.secondaryText,
            inputBackground: colors?.background,
            inputText: readable.backgroundText,
            inputBorder: colors?.border,
            overlayBackground: hexToRgba(colors?.background, 0.5),
        },
        cmsFeed: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            borderColor: colors?.border,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        heroGallery: {
            primary: colors?.primary,
            secondary: colors?.secondary,
            background: colors?.background,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        heroWave: {
            primary: colors?.primary,
            secondary: colors?.secondary,
            background: colors?.background,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        heroNova: {
            primary: colors?.primary,
            secondary: colors?.secondary,
            background: colors?.background,
            text: readable.backgroundText,
            heading: readable.backgroundHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            accent: colors?.accent,
        },
        heroLead: {
            background: colors?.background,
            infoBackground: colors?.background,
            formBackground: colors?.surface,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            inputBackground: colors?.background,
            inputText: readable.backgroundHeading,
            inputBorder: colors?.border,
            inputPlaceholder: readable.backgroundMuted,
            badgeBackground: colors?.primary,
            badgeText: readable.primaryText,
            formHeading: readable.surfaceHeading,
            formText: readable.surfaceText,
            borderColor: colors?.border,
        },
        screenshotCarousel: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            arrowBackground: 'rgba(0, 0, 0, 0.5)',
            arrowText: '#ffffff',
            dotActive: '#ffffff',
            dotInactive: 'rgba(255, 255, 255, 0.5)',
        },
        productDetail: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            priceColor: readable.backgroundHeading,
            salePriceColor: colors?.error,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        categoryProducts: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
        },
        articleContent: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            linkColor: colors?.primary,
        },
        productGrid: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        cart: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
        },
        checkout: {
            background: colors?.background,
            heading: readable.backgroundHeading,
            text: readable.backgroundText,
            accent: colors?.accent,
            cardBackground: colors?.surface,
            cardText: readable.surfaceText,
            cardHeading: readable.surfaceHeading,
            buttonBackground: colors?.primary,
            buttonText: readable.primaryText,
            inputBackground: colors?.background,
            inputBorder: colors?.border,
        },
    };
};

/**
 * Genera los colores del gradiente para HeroWave basándose en la paleta global.
 * Usa primary, secondary y accent como base y genera stops intermedios.
 * Exportado para uso en onboarding y templates.
 */
export const generateHeroWaveGradientColors = (colors: GlobalColors): string[] => {
    const gradientColors: string[] = [
        colors?.primary,
        colors?.secondary,
        colors?.accent,
    ].filter(Boolean);

    // Asegurar al menos 2 colores para un gradiente válido
    if (gradientColors.length < 2) {
        return ['#ff006e', '#fb5607', '#ffbe0b', '#38b000', '#00b4d8'];
    }

    return gradientColors;
};

const GlobalStylesControl: React.FC<GlobalStylesControlProps> = ({ mode = 'both' }) => {
    const { t } = useTranslation();
    const { updateComponentStyle } = useAdmin();
    const { theme, setTheme, data, setData, activeProject, brandIdentity, componentOrder } = useProject();
    const [activeTab, setActiveTab] = useState<Tab>('colors');
    const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
    const [selectedExpertCandidateId, setSelectedExpertCandidateId] = useState<string | null>(null);
    const [expertColorCandidates, setExpertColorCandidates] = useState<ColorCandidate[]>([]);
    const [isApplying, setIsApplying] = useState(false);
    const [showCoolorsImporter, setShowCoolorsImporter] = useState(false);

    // Website colors are the canonical palette for this project.
    const globalColors = normalizeGlobalColors(theme.globalColors);

    // Create full array of all palette colors for ColorControl
    // This ensures users can pick any color from the palette, not just the 4 preview colors
    const allPaletteColors = getWebsitePaletteColors(globalColors);

    // Determine which content to show based on mode
    const showColors = mode === 'colors' || mode === 'both';
    const showTypography = mode === 'typography' || mode === 'both';
    const showTabs = mode === 'both';

    // Preload ALL fonts when typography controls are visible
    useEffect(() => {
        if (showTypography || (showTabs && activeTab === 'typography')) {
            loadAllFonts();
        }
    }, [showTypography, showTabs, activeTab]);

    // Auto-migrate old/removed font keys to new equivalents
    useEffect(() => {
        const resolvedHeader = resolveFontFamily(theme.fontFamilyHeader);
        const resolvedBody = resolveFontFamily(theme.fontFamilyBody);
        const resolvedButton = resolveFontFamily(theme.fontFamilyButton);
        const needsMigration =
            resolvedHeader !== theme.fontFamilyHeader ||
            resolvedBody !== theme.fontFamilyBody ||
            resolvedButton !== theme.fontFamilyButton;
        if (needsMigration) {
            setTheme(prev => ({
                ...prev,
                fontFamilyHeader: resolvedHeader,
                fontFamilyBody: resolvedBody,
                fontFamilyButton: resolvedButton,
            }));
        }
    }, []); // Run once on mount

    const handleFontChange = (key: 'fontFamilyHeader' | 'fontFamilyBody' | 'fontFamilyButton', value: FontFamily) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    const handleColorChange = (colorKey: keyof GlobalColors, value: string) => {
        const newColors = normalizeGlobalColors({
            ...globalColors,
            [colorKey]: value,
        });

        setTheme(prev => {
            return {
                ...prev,
                globalColors: newColors,
                pageBackground: colorKey === 'background' ? value : (prev.pageBackground || newColors.background),
                paletteColors: getWebsitePaletteColors(newColors),
            };
        });

        void applyPaletteToAllComponents(newColors);
        setSelectedPaletteId(null); // Clear palette selection when custom color is picked
    };

    const handleReapplyWebsiteColors = async () => {
        const colors = normalizeGlobalColors(globalColors);
        setIsApplying(true);
        try {
            setTheme(prev => ({
                ...prev,
                globalColors: colors,
                pageBackground: colors.background,
                paletteColors: getWebsitePaletteColors(colors),
            }));
            await applyPaletteToAllComponents(colors);
        } catch (error) {
            console.error('Error re-applying website colors:', error);
        } finally {
            setIsApplying(false);
        }
    };

    /**
     * Aplica los colores de la paleta a todos los componentes
     * Actualiza tanto componentStyles como data para asegurar que los colores se apliquen
     */
    const applyPaletteToAllComponents = async (colors: GlobalColors) => {
        const componentColorMappings = generateComponentColorMappings(colors);
        const genericComponentColors = getGenericComponentColorMapping(colors);
        const readable = getReadableRoles(colors);

        // Aplicar colores a cada componente en componentStyles
        for (const [componentId, componentColors] of Object.entries(componentColorMappings)) {
            await updateComponentStyle(componentId, { colors: componentColors }, false);
        }

        // También actualizar los colores en data para que tengan prioridad en el merge
        if (data && setData) {
            setData((prev: PageData | null) => {
                if (!prev) return prev;

                const newData = { ...prev };
                const applyColorsToDataComponent = (componentId: string, componentColors: Record<string, string>) => {
                    const key = componentId as keyof PageData;
                    if (!newData[key] || typeof newData[key] !== 'object' || Array.isArray(newData[key])) return;

                    (newData[key] as any) = {
                        ...(newData[key] as any),
                        colors: {
                            ...((newData[key] as any).colors || {}),
                            ...componentColors
                        }
                    };

                    // Usar los nuevos colores para actualizar propiedades raíz si existen (vital para compatibilidad y fallback visual)
                    if (componentColors.background) (newData[key] as any).backgroundColor = componentColors.background;
                    if (componentColors.text) (newData[key] as any).textColor = componentColors.text;
                    if (componentColors.primary || componentColors.accent) (newData[key] as any).accentColor = componentColors.accent || componentColors.primary;
                    if (componentColors.error) (newData[key] as any).errorColor = componentColors.error;
                    // Update overlay colors for SectionBackground (background image overlays)
                    if (componentColors.background && (newData[key] as any).backgroundOverlayColor) {
                        (newData[key] as any).backgroundOverlayColor = componentColors.background;
                    }
                    // Update banner/productHero/collectionBanner overlayColor
                    if (componentColors.overlayColor) {
                        (newData[key] as any).overlayColor = componentColors.overlayColor;
                    }
                };

                for (const componentId of Object.keys(newData)) {
                    if (NON_VISUAL_DATA_KEYS.has(componentId)) continue;
                    applyColorsToDataComponent(
                        componentId,
                        componentColorMappings[componentId] || genericComponentColors
                    );
                }

                // Keep the store-wide ecommerce color contract synchronized for dynamic store pages.
                if (newData.storeSettings && typeof newData.storeSettings === 'object' && !Array.isArray(newData.storeSettings)) {
                    (newData.storeSettings as any) = {
                        ...(newData.storeSettings as any),
                        colors: {
                            ...((newData.storeSettings as any).colors || {}),
                            ...(componentColorMappings.storeSettings || genericComponentColors),
                        },
                        cartDrawerColors: {
                            ...((newData.storeSettings as any).cartDrawerColors || {}),
                            background: colors.background,
                            heading: readable.backgroundHeading,
                            text: readable.backgroundText,
                            accent: colors.primary,
                            cardBackground: colors.surface,
                            cardText: readable.surfaceText,
                            buttonBackground: colors.primary,
                            buttonText: readable.primaryText,
                            priceColor: readable.surfaceHeading,
                            borderColor: colors.border,
                        },
                    };
                }

                // Actualizar gradientColors y waveColor de HeroWave con los colores de la paleta
                // Si heroWave no existe en data pero está en componentStyles, inicializarlo
                if (!newData.heroWave || typeof newData.heroWave !== 'object') {
                    (newData as any).heroWave = {};
                }
                (newData.heroWave as any).gradientColors = generateHeroWaveGradientColors(colors);
                (newData.heroWave as any).waveColor = colors.background || '#ffffff';

                return newData;
            });
        }
    };

    const handleGenerateExpertPalettes = () => {
        const hasEcommerce = componentOrder.some(section => [
            'announcementBar', 'productHero', 'featuredProducts', 'categoryGrid', 'trustBadges',
            'saleCountdown', 'collectionBanner', 'recentlyViewed', 'productReviews', 'productBundle',
            'productGrid', 'productDetail', 'cart', 'checkout',
        ].includes(section));
        const colorBrief = createColorBriefFromTheme({
            theme,
            industry: brandIdentity?.industry || activeProject?.brandIdentity?.industry || '',
            businessName: activeProject?.name,
            description: brandIdentity?.coreValues || activeProject?.brandIdentity?.coreValues || '',
            activeComponents: componentOrder,
            hasEcommerce,
        });
        const candidates = generateColorCandidates(colorBrief);
        setExpertColorCandidates(candidates);
        setSelectedExpertCandidateId(candidates[0]?.id || null);
        setSelectedPaletteId(null);
    };

    const handleExpertCandidateSelect = async (candidate: ColorCandidate) => {
        const colors = normalizeGlobalColors(toGlobalColors(candidate));
        setIsApplying(true);
        setSelectedExpertCandidateId(candidate.id);
        setSelectedPaletteId(null);
        try {
            setTheme(prev => ({
                ...prev,
                globalColors: colors,
                pageBackground: colors.background,
                paletteColors: getWebsitePaletteColors(colors),
            }));
            await applyPaletteToAllComponents(colors);
        } catch (error) {
            console.error('Error applying expert color candidate:', error);
        } finally {
            setIsApplying(false);
        }
    };

    /**
     * Maneja la selección de una paleta predefinida
     * 1. Actualiza los colores globales del tema
     * 2. Propaga los colores a todos los componentes
     * 3. Guarda los colores de preview para acceso rápido en el selector
     */
    const handlePaletteSelect = async (palette: ColorPalette) => {
        setIsApplying(true);
        setSelectedPaletteId(palette.id);

        try {
            // 1. Actualizar colores globales del tema y guardar colores de la paleta para acceso rápido
            setTheme(prev => ({
                ...prev,
                globalColors: palette.colors,
                pageBackground: palette.colors?.background,
                paletteColors: getWebsitePaletteColors(palette.colors),
            }));

            // 2. Aplicar colores a todos los componentes
            await applyPaletteToAllComponents(palette.colors);
        } catch (error) {
            console.error('Error applying palette to components:', error);
        } finally {
            setIsApplying(false);
        }
    };

    /**
     * Resetea los colores a la paleta por defecto (Modern Dark)
     */
    const handleResetColors = async () => {
        const defaultPalette = colorPalettes.find(p => p.id === 'modern-dark') || colorPalettes[0];
        await handlePaletteSelect(defaultPalette);
    };

    /**
     * Callback cuando se genera una paleta desde Coolors.co
     */
    const handleCoolorsPaletteGenerated = async (colors: GlobalColors, preview: string[], _paletteName?: string) => {
        setIsApplying(true);
        try {
            // Actualizar colores globales del tema Y guardar los colores de la paleta original
            // El paletteName no se usa aquí ya que es para templates, pero lo aceptamos para cumplir la interfaz
            setTheme(prev => ({
                ...prev,
                globalColors: colors,
                pageBackground: colors?.background,
                paletteColors: Array.from(new Set([
                    ...getWebsitePaletteColors(colors),
                    ...preview,
                ])),
            }));

            // Aplicar colores a todos los componentes
            await applyPaletteToAllComponents(colors);

            // Cerrar el importador y limpiar selección de paleta predefinida
            setShowCoolorsImporter(false);
            setSelectedPaletteId(null);
        } catch (error) {
            console.error('Error applying Coolors palette:', error);
        } finally {
            setIsApplying(false);
        }
    };



    const handleWeightChange = (key: string, value: number) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    const handleStyleToggle = (key: string) => {
        const currentValue = (theme as any)[key] || 'normal';
        setTheme(prev => ({ ...prev, [key]: currentValue === 'normal' ? 'italic' : 'normal' }));
    };

    const renderFontSelect = (
        label: string,
        familyKey: 'fontFamilyHeader' | 'fontFamilyBody' | 'fontFamilyButton',
        weightKey: string = '',
        styleKey: string = '',
        defaultWeight: number = 400
    ) => (
        <div className="mb-5 last:mb-0">
            {/* Font Family Select using FontFamilyPicker */}
            <div className="mb-2">
                <FontFamilyPicker
                    label={label}
                    value={theme[familyKey] as FontFamily}
                    onChange={(font) => handleFontChange(familyKey, font)}
                    showPreview={false}
                />
            </div>
            {/* Weight + Italic row */}
            {weightKey && (
                <div className="flex gap-2">
                    <FontWeightPicker
                        value={(theme as any)[weightKey] || defaultWeight}
                        onChange={(weight) => handleWeightChange(weightKey, weight)}
                    />
                    {styleKey && (
                        <button
                            onClick={() => handleStyleToggle(styleKey)}
                            className={`flex items-center justify-center w-8 self-stretch rounded-md border transition-all cursor-pointer ${
                                (theme as any)[styleKey] === 'italic'
                                    ? 'bg-q-accent/20 border-q-accent text-q-accent'
                                    : 'bg-q-surface border-q-border text-q-text-secondary hover:border-q-accent/50'
                            }`}
                            title={t('globalStyles.italic')}
                        >
                            <span className="text-sm font-serif italic">I</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Tab Selector - Only show when mode is 'both' */}
            {showTabs && (
                <div className="flex bg-q-bg rounded-lg p-1 border border-q-border">
                    <button
                        onClick={() => setActiveTab('colors')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'colors'
                            ? 'bg-q-accent text-q-bg shadow-sm'
                            : 'text-q-text-secondary hover:text-q-text hover:bg-q-surface/50'
                            }`}
                    >
                        <Palette size={16} />
                        {t('editor.controls.globalStyles.colors', 'Colors')}
                    </button>
                    <button
                        onClick={() => setActiveTab('typography')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'typography'
                            ? 'bg-q-accent text-q-bg shadow-sm'
                            : 'text-q-text-secondary hover:text-q-text hover:bg-q-surface/50'
                            }`}
                    >
                        <Type size={16} />
                        {t('editor.controls.globalStyles.typography', 'Typography')}
                    </button>
                </div>
            )}

            {/* Colors Content - Show when mode is 'colors' OR when mode is 'both' and activeTab is 'colors' */}
            {(mode === 'colors' || (showTabs && activeTab === 'colors')) && (
                <div className="flex flex-col gap-5">
                    {/* Coolors.co Importer Section */}
                    <div className="order-1 border border-dashed border-q-accent/30 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setShowCoolorsImporter(!showCoolorsImporter)}
                            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-q-accent/10 to-q-accent/10 hover:from-q-accent/20 hover:to-q-accent/20 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Upload size={16} className="text-q-accent" />
                                <span className="text-sm font-medium text-q-text">
                                    {t('editor.controls.globalStyles.importPalette', 'Importar paleta')}
                                </span>
                            </div>
                            <ChevronDown size={14} className={`text-q-accent transition-transform ${showCoolorsImporter ? 'rotate-180' : ''}`} />
                        </button>

                        {showCoolorsImporter && (
                            <div className="p-4 border-t border-q-accent/20">
                                <CoolorsImporter onPaletteGenerated={handleCoolorsPaletteGenerated} />
                            </div>
                        )}
                    </div>

                    {/* Re-apply website colors button */}
                    <div className="order-2">
                        <button
                            onClick={handleReapplyWebsiteColors}
                            disabled={isApplying}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-q-accent to-q-accent hover:from-q-accent hover:to-q-accent border border-q-accent/30 rounded-lg text-sm font-medium text-q-accent flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isApplying ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Sparkles size={14} />
                            )}
                            {t('editor.controls.globalStyles.reapplyColors', 'Reaplicar colores a todos los componentes')}
                        </button>
                    </div>

                    {/* Quimera Color Expert Section */}
                    <div className="order-3 rounded-lg border border-q-border bg-q-surface/30 p-3">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="min-w-0">
                                <label className="text-xs font-bold text-q-accent uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles size={14} />
                                    {t('editor.controls.globalStyles.colorExpert', 'Color Expert')}
                                </label>
                                <p className="mt-1 text-[11px] text-q-text-secondary">
                                    {t('editor.controls.globalStyles.colorExpertDescription', 'Genera sistemas de color validados para este website.')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerateExpertPalettes}
                                disabled={isApplying}
                                className="shrink-0 rounded-lg border border-q-border bg-q-bg px-3 py-2 text-[11px] font-medium text-q-text-secondary hover:border-q-accent/60 hover:text-q-accent disabled:opacity-50"
                            >
                                {t('editor.controls.globalStyles.generateExpertPalettes', 'Generar paletas expertas')}
                            </button>
                        </div>

                        {expertColorCandidates.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                                {expertColorCandidates.slice(0, 6).map(candidate => (
                                    <button
                                        key={candidate.id}
                                        type="button"
                                        onClick={() => handleExpertCandidateSelect(candidate)}
                                        disabled={isApplying}
                                        className={`rounded-lg border p-2 text-left transition-all ${
                                            selectedExpertCandidateId === candidate.id
                                                ? 'border-q-accent bg-q-accent/10 ring-1 ring-q-accent/30'
                                                : 'border-q-border bg-q-bg hover:border-q-accent/50'
                                        } ${isApplying ? 'opacity-60 cursor-wait' : ''}`}
                                    >
                                        <div className="flex gap-1 mb-2">
                                            {candidate.preview.slice(0, 5).map((color, index) => (
                                                <span
                                                    key={`${candidate.id}-${color}-${index}`}
                                                    className="h-4 flex-1 rounded border border-q-border/10"
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-[11px] font-semibold text-q-text">{candidate.labelEs || candidate.label}</span>
                                            <span className="text-[10px] text-q-accent">{candidate.system.score}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Palettes Section */}
                    <div className="order-5">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-q-accent uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={14} />
                                {t('editor.controls.globalStyles.suggestedPalettes', 'Paletas sugeridas')}
                            </label>
                            <button
                                onClick={handleResetColors}
                                disabled={isApplying}
                                className="text-xs text-q-text-secondary hover:text-q-accent flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('globalStyles.resetColors')}
                            >
                                <RotateCcw size={12} className={isApplying ? 'animate-spin' : ''} />
                                {t('editor.controls.globalStyles.reset', 'Reset')}
                            </button>
                        </div>

                        {/* Info Banner */}
                        <div className="mb-3 p-2.5 bg-q-accent/10 border border-q-accent/30 rounded-lg">
                            <p className="text-xs text-q-accent flex items-start gap-2">
                                <Info size={14} className="flex-shrink-0 mt-0.5" />
                                <span>
                                    {t('editor.controls.globalStyles.infoBanner', 'When selecting a palette, colors will be applied to **all components**. You can then customize them individually from each section\'s controls.')}
                                </span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {colorPalettes.map((palette) => (
                                <button
                                    key={palette.id}
                                    onClick={() => handlePaletteSelect(palette)}
                                    disabled={isApplying}
                                    className={`relative p-2.5 rounded-lg border transition-all text-left group ${selectedPaletteId === palette.id
                                        ? 'border-q-accent ring-1 ring-q-accent bg-q-accent/10'
                                        : 'border-q-border hover:border-q-accent/50 bg-q-bg hover:bg-q-surface/50'
                                        } ${isApplying ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                                >
                                    {/* Selection indicator */}
                                    {selectedPaletteId === palette.id && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-q-accent rounded-full flex items-center justify-center">
                                            {isApplying ? (
                                                <Loader2 size={10} className="text-q-bg animate-spin" />
                                            ) : (
                                                <Check size={10} className="text-q-bg" />
                                            )}
                                        </div>
                                    )}

                                    {/* Color Preview */}
                                    <div className="flex gap-1 mb-2">
                                        {palette.preview.map((color, idx) => (
                                            <div
                                                key={idx}
                                                className="w-5 h-5 rounded-md border border-q-border/10 shadow-sm"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>

                                    {/* Palette Name */}
                                    <p className="text-xs font-medium text-q-text truncate">
                                        {palette.nameEs}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}

                    {/* Custom Colors Section */}
                    <div className="order-4">
                        <label className="block text-xs font-bold text-q-text-secondary mb-3 uppercase tracking-wider flex items-center gap-2">
                            <Grid size={14} />
                            {t('editor.controls.globalStyles.websiteColors', 'Colores del website')}
                        </label>

                        <div className="space-y-4">
                            {/* Primary Colors */}
                            <div className="bg-q-surface/30 p-3 rounded-lg border border-q-border/50">
                                <p className="text-xs font-semibold text-q-text mb-3">{t('editor.controls.globalStyles.mainColors', 'Main Colors')}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.primary', 'Primary')}
                                        value={globalColors.primary}
                                        onChange={(v) => handleColorChange('primary', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.secondary', 'Secondary')}
                                        value={globalColors.secondary}
                                        onChange={(v) => handleColorChange('secondary', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                </div>
                                <div className="mt-3">
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.accent', 'Accent')}
                                        value={globalColors.accent}
                                        onChange={(v) => handleColorChange('accent', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                </div>
                            </div>

                            {/* Background Colors */}
                            <div className="bg-q-surface/30 p-3 rounded-lg border border-q-border/50">
                                <p className="text-xs font-semibold text-q-text mb-3">{t('editor.controls.globalStyles.backgrounds', 'Backgrounds')}</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.mainBackground', 'Main Background')}
                                        value={globalColors.background}
                                        onChange={(v) => {
                                            handleColorChange('background', v);
                                            setTheme(prev => ({ ...prev, pageBackground: v }));
                                        }}
                                        paletteColors={allPaletteColors}
                                    />
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.surfaceBackground', 'Surface')}
                                        value={globalColors.surface}
                                        onChange={(v) => handleColorChange('surface', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                </div>
                            </div>

                            <div className="bg-q-surface/30 p-3 rounded-lg border border-q-border/50">
                                <p className="text-xs font-semibold text-q-text mb-3">{t('editor.controls.globalStyles.textColors', 'Text')}</p>
                                <div className="space-y-1">
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.text', 'Text')}
                                        value={globalColors.text}
                                        onChange={(v) => handleColorChange('text', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.headings', 'Headings')}
                                        value={globalColors.heading}
                                        onChange={(v) => handleColorChange('heading', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.textSecondary', 'Secondary Text')}
                                        value={globalColors.textMuted}
                                        onChange={(v) => handleColorChange('textMuted', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                </div>
                            </div>

                            {/* Border & Status Colors */}
                            <div className="bg-q-surface/30 p-3 rounded-lg border border-q-border/50">
                                <p className="text-xs font-semibold text-q-text mb-3">{t('editor.controls.globalStyles.bordersStates', 'Borders & States')}</p>
                                <div className="space-y-1">
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.borders', 'Borders')}
                                        value={globalColors.border}
                                        onChange={(v) => handleColorChange('border', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.success', 'Success')}
                                        value={globalColors.success}
                                        onChange={(v) => handleColorChange('success', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.error', 'Error')}
                                        value={globalColors.error}
                                        onChange={(v) => handleColorChange('error', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Typography Content - Show when mode is 'typography' OR when mode is 'both' and activeTab is 'typography' */}
            {(mode === 'typography' || (showTabs && activeTab === 'typography')) && (
                <div className="space-y-5">
                    {/* Font Controls */}
                    <div className="bg-q-surface/30 p-4 rounded-lg border border-q-border">
                        <label className="block text-xs font-bold text-q-accent mb-4 uppercase tracking-wider flex items-center gap-2">
                            <Type size={14} />
                            {t('editor.controls.globalStyles.globalFonts', 'Global Fonts')}
                        </label>
                        {renderFontSelect(t('editor.controls.globalStyles.headingsFont', 'Headings'), 'fontFamilyHeader', 'fontWeightHeader', 'fontStyleHeader', 700)}
                        {renderFontSelect(t('editor.controls.globalStyles.bodyFont', 'Body'), 'fontFamilyBody', 'fontWeightBody', 'fontStyleBody', 400)}
                        {renderFontSelect(t('editor.controls.globalStyles.buttonsFont', 'Buttons'), 'fontFamilyButton', 'fontWeightButton', 'fontStyleButton', 600)}

                        {/* All Caps Toggles Section */}
                        <div className="mt-4 pt-4 border-t border-q-border/50 space-y-4">
                            <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">
                                {t('editor.controls.globalStyles.allCapsOptions', 'All Caps')}
                            </label>

                            {/* Headings All Caps */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm text-q-text">
                                        {t('editor.controls.globalStyles.headingsAllCaps', 'Headings')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setTheme(prev => ({ ...prev, headingsAllCaps: !prev.headingsAllCaps }))}
                                    className={`${theme.headingsAllCaps ? 'bg-q-accent' : 'bg-q-surface-overlay'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none`}
                                >
                                    <span
                                        className={`${theme.headingsAllCaps ? 'translate-x-[16px]' : 'translate-x-0'} pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-q-surface shadow-sm ring-0 transition duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>

                            {/* Buttons All Caps */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm text-q-text">
                                        {t('editor.controls.globalStyles.buttonsAllCaps', 'Buttons')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setTheme(prev => ({ ...prev, buttonsAllCaps: !prev.buttonsAllCaps }))}
                                    className={`${theme.buttonsAllCaps ? 'bg-q-accent' : 'bg-q-surface-overlay'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none`}
                                >
                                    <span
                                        className={`${theme.buttonsAllCaps ? 'translate-x-[16px]' : 'translate-x-0'} pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-q-surface shadow-sm ring-0 transition duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>

                            {/* Nav Links All Caps */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm text-q-text">
                                        {t('editor.controls.globalStyles.navLinksAllCaps', 'Navigation Links')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setTheme(prev => ({ ...prev, navLinksAllCaps: !prev.navLinksAllCaps }))}
                                    className={`${theme.navLinksAllCaps ? 'bg-q-accent' : 'bg-q-surface-overlay'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none`}
                                >
                                    <span
                                        className={`${theme.navLinksAllCaps ? 'translate-x-[16px]' : 'translate-x-0'} pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-q-surface shadow-sm ring-0 transition duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Font Preview */}
                    <div className="p-4 rounded-lg border border-q-border bg-q-bg">
                        <p className="text-xs text-q-text-secondary mb-3 uppercase tracking-wider font-bold">
                            {t('editor.controls.globalStyles.preview', 'Preview')}
                        </p>
                        <div
                            className="p-4 rounded-lg"
                            style={{
                                backgroundColor: globalColors.background,
                                borderColor: globalColors.border,
                                borderWidth: '1px'
                            }}
                        >
                            {/* Nav Links Preview */}
                            <div className="flex gap-4 mb-4 pb-3 border-b border-q-border/10">
                                {[t('editor.controls.globalStyles.navLinks.home', 'Home'), t('editor.controls.globalStyles.navLinks.services', 'Services'), t('editor.controls.globalStyles.navLinks.contact', 'Contact')].map((link) => (
                                    <span
                                        key={link}
                                        className="text-sm"
                                        style={{
                                            fontFamily: getFontStack((theme.fontFamilyHeader as FontFamily) || 'inter'),
                                            color: globalColors.text,
                                            textTransform: theme.navLinksAllCaps ? 'uppercase' : 'none',
                                            letterSpacing: theme.navLinksAllCaps ? '0.05em' : 'normal'
                                        }}
                                    >
                                        {link}
                                    </span>
                                ))}
                            </div>

                            <h3
                                className="text-xl mb-2 font-bold"
                                style={{
                                    fontFamily: getFontStack((theme.fontFamilyHeader as FontFamily) || 'inter'),
                                    color: globalColors.heading,
                                    textTransform: theme.headingsAllCaps ? 'uppercase' : 'none',
                                    letterSpacing: theme.headingsAllCaps ? '0.05em' : 'normal'
                                }}
                            >
                                {t('editor.controls.globalStyles.previewTitle', 'Example Title')}
                            </h3>
                            <p
                                className="text-sm mb-4"
                                style={{
                                    fontFamily: getFontStack((theme.fontFamilyBody as FontFamily) || 'inter'),
                                    color: globalColors.text
                                }}
                            >
                                {t('editor.controls.globalStyles.previewBody', 'This is an example paragraph...')}
                            </p>
                            <button
                                className="px-4 py-2 rounded-md text-sm font-medium"
                                style={{
                                    fontFamily: getFontStack(theme.fontFamilyButton || 'poppins'),
                                    backgroundColor: globalColors.primary,
                                    color: '#ffffff',
                                    textTransform: theme.buttonsAllCaps ? 'uppercase' : 'none',
                                    letterSpacing: theme.buttonsAllCaps ? '0.05em' : 'normal'
                                }}
                            >
                                {t('editor.controls.globalStyles.previewButton', 'Example Button')}
                            </button>
                        </div>
                    </div>

                    {/* Typography Tips */}
                    <div className="p-3 rounded-lg border border-q-accent/30 bg-q-accent/5">
                        <p className="text-xs text-q-accent font-medium mb-1">💡 {t('editor.controls.globalStyles.tip', 'Tip')}</p>
                        <p className="text-xs text-q-text-secondary">
                            {t('editor.controls.globalStyles.tipContent', 'For a professional design, use different fonts for headings and body text. For example: Playfair Display for headings and Lato for body.')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalStylesControl;
