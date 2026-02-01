/**
 * GlobalStylesControl - Control global de estilos
 * Puede mostrar solo colores, solo tipografía, o ambos (con tabs)
 * 
 * Al seleccionar una paleta predefinida, los colores se aplican a TODOS los componentes.
 * Luego el usuario puede personalizar colores individualmente por componente.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '../../contexts/EditorContext';
import { useAdmin } from '../../contexts/admin/AdminContext';
import { useProject } from '../../contexts/project/ProjectContext';
import { FontFamily, GlobalColors, PageData } from '../../types';
import ColorControl from './ColorControl';
import CoolorsImporter from './CoolorsImporter';
import { colorPalettes, ColorPalette, getDefaultGlobalColors } from '../../data/colorPalettes';
import { hexToRgba } from '../../utils/colorUtils';
import { Type, Palette, Check, Sparkles, Grid, RotateCcw, Info, Loader2, Upload, ChevronDown } from 'lucide-react';

export type GlobalStylesMode = 'colors' | 'typography' | 'both';

const fontOptions: FontFamily[] = [
    'roboto', 'open-sans', 'lato', 'slabo-27px', 'oswald', 'source-sans-pro',
    'montserrat', 'raleway', 'pt-sans', 'merriweather', 'lora', 'ubuntu',
    'playfair-display', 'crimson-text', 'poppins', 'arvo', 'mulish',
    'noto-sans', 'noto-serif', 'inconsolata', 'indie-flower', 'cabin',
    'fira-sans', 'pacifico', 'josefin-sans', 'anton', 'yanone-kaffeesatz',
    'arimo', 'lobster', 'bree-serif', 'vollkorn', 'abel', 'archivo-narrow',
    'francois-one', 'signika', 'oxygen', 'quicksand', 'pt-serif', 'bitter',
    'exo-2', 'varela-round', 'dosis', 'noticia-text', 'titillium-web',
    'nobile', 'cardo', 'asap', 'questrial', 'dancing-script', 'amatic-sc'
];

// Font stacks for CSS font-family property
const fontStacks: Record<FontFamily, string> = {
    roboto: "'Roboto', sans-serif",
    'open-sans': "'Open Sans', sans-serif",
    lato: "'Lato', sans-serif",
    'slabo-27px': "'Slabo 27px', serif",
    oswald: "'Oswald', sans-serif",
    'source-sans-pro': "'Source Sans Pro', sans-serif",
    montserrat: "'Montserrat', sans-serif",
    raleway: "'Raleway', sans-serif",
    'pt-sans': "'PT Sans', sans-serif",
    merriweather: "'Merriweather', serif",
    lora: "'Lora', serif",
    ubuntu: "'Ubuntu', sans-serif",
    'playfair-display': "'Playfair Display', serif",
    'crimson-text': "'Crimson Text', serif",
    poppins: "'Poppins', sans-serif",
    arvo: "'Arvo', serif",
    mulish: "'Mulish', sans-serif",
    'noto-sans': "'Noto Sans', sans-serif",
    'noto-serif': "'Noto Serif', serif",
    inconsolata: "'Inconsolata', monospace",
    'indie-flower': "'Indie Flower', cursive",
    cabin: "'Cabin', sans-serif",
    'fira-sans': "'Fira Sans', sans-serif",
    pacifico: "'Pacifico', cursive",
    'josefin-sans': "'Josefin Sans', sans-serif",
    anton: "'Anton', sans-serif",
    'yanone-kaffeesatz': "'Yanone Kaffeesatz', sans-serif",
    arimo: "'Arimo', sans-serif",
    lobster: "'Lobster', cursive",
    'bree-serif': "'Bree Serif', serif",
    vollkorn: "'Vollkorn', serif",
    abel: "'Abel', sans-serif",
    'archivo-narrow': "'Archivo Narrow', sans-serif",
    'francois-one': "'Francois One', sans-serif",
    signika: "'Signika', sans-serif",
    oxygen: "'Oxygen', sans-serif",
    quicksand: "'Quicksand', sans-serif",
    'pt-serif': "'PT Serif', serif",
    bitter: "'Bitter', serif",
    'exo-2': "'Exo 2', sans-serif",
    'varela-round': "'Varela Round', sans-serif",
    dosis: "'Dosis', sans-serif",
    'noticia-text': "'Noticia Text', serif",
    'titillium-web': "'Titillium Web', sans-serif",
    nobile: "'Nobile', sans-serif",
    cardo: "'Cardo', serif",
    asap: "'Asap', sans-serif",
    questrial: "'Questrial', sans-serif",
    'dancing-script': "'Dancing Script', cursive",
    'amatic-sc': "'Amatic SC', cursive",
};

const formatFontName = (font: string) => {
    return font.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Get the CSS font-family value for a font
const getFontStack = (font: FontFamily): string => {
    return fontStacks[font] || "'Poppins', sans-serif";
};

type Tab = 'typography' | 'colors';

interface GlobalStylesControlProps {
    mode?: GlobalStylesMode;
}

/**
 * Genera el mapeo de colores de la paleta global a cada componente
 * Exportado para uso en onboarding y otras partes de la aplicación
 */
export const generateComponentColorMappings = (colors: GlobalColors): Record<string, Record<string, string>> => {
    return {
        hero: {
            primary: colors?.primary,
            secondary: colors?.secondary,
            background: colors?.background,
            text: colors?.text,
            heading: colors?.heading,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
            secondaryButtonBackground: colors?.surface,
            secondaryButtonText: colors?.text,
        },
        heroSplit: {
            textBackground: colors?.background,
            imageBackground: colors?.surface,
            heading: colors?.heading,
            text: colors?.text,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
        },
        banner: {
            background: colors?.surface,
            overlayColor: '#000000',
            heading: colors?.heading,
            text: colors?.text,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
        },
        map: {
            background: colors?.background,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            cardBackground: colors?.primary,
            borderColor: colors?.border,
        },
        features: {
            background: colors?.background,
            accent: colors?.primary,
            borderColor: colors?.border,
            text: colors?.text,
            heading: colors?.heading,
            description: colors?.text,
            cardBackground: colors?.primary,
            cardHeading: '#ffffff',
            cardText: 'rgba(255, 255, 255, 0.9)',
        },
        testimonials: {
            background: colors?.surface,
            accent: colors?.primary,
            borderColor: colors?.border,
            text: colors?.text,
            heading: colors?.heading,
            cardBackground: colors?.primary,
        },
        cta: {
            background: colors?.background,
            gradientStart: colors?.primary,
            gradientEnd: colors?.secondary,
            text: '#ffffff',
            heading: '#ffffff',
            description: 'rgba(255, 255, 255, 0.8)',
            buttonBackground: '#ffffff',
            buttonText: colors?.primary,
        },
        services: {
            background: colors?.surface,
            accent: colors?.primary,
            borderColor: colors?.border,
            text: colors?.text,
            heading: colors?.heading,
            description: colors?.text,
            cardBackground: colors?.primary,
            cardHeading: '#ffffff',
            cardText: 'rgba(255, 255, 255, 0.9)',
        },
        team: {
            background: colors?.background,
            text: colors?.text,
            heading: colors?.heading,
            accent: colors?.primary,
            cardBackground: colors?.surface,
            photoBorderColor: colors?.primary,
        },
        slideshow: {
            background: colors?.surface,
            heading: colors?.heading,
            arrowBackground: 'rgba(0, 0, 0, 0.5)',
            arrowText: '#ffffff',
            dotActive: '#ffffff',
            dotInactive: 'rgba(255, 255, 255, 0.5)',
            captionBackground: 'rgba(0, 0, 0, 0.7)',
            captionText: '#ffffff',
        },
        pricing: {
            background: colors?.background,
            accent: colors?.primary,
            borderColor: colors?.border,
            text: colors?.text,
            heading: colors?.heading,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
            gradientStart: colors?.primary,
            gradientEnd: colors?.secondary,
            cardBackground: colors?.surface,
        },
        faq: {
            background: colors?.secondary,
            accent: colors?.primary,
            borderColor: colors?.border,
            text: '#ffffff',
            heading: '#ffffff',
            cardBackground: colors?.secondary,
            gradientStart: colors?.primary,
            gradientEnd: colors?.secondary,
        },
        portfolio: {
            background: colors?.background,
            accent: colors?.primary,
            borderColor: colors?.border,
            text: colors?.text,
            heading: colors?.heading,
            cardBackground: 'rgba(0,0,0,0.8)',
            cardTitleColor: '#ffffff',
            cardTextColor: 'rgba(255,255,255,0.9)',
            cardOverlayStart: 'rgba(0,0,0,0.9)',
            cardOverlayEnd: 'rgba(0,0,0,0.2)',
        },
        leads: {
            background: colors?.background,
            accent: colors?.primary,
            borderColor: colors?.border,
            text: colors?.text,
            heading: colors?.heading,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
            cardBackground: colors?.primary,
            inputBackground: colors?.background,
            inputText: colors?.heading,
            inputBorder: colors?.border,
            gradientStart: colors?.primary,
            gradientEnd: colors?.secondary,
        },
        newsletter: {
            background: colors?.surface,
            accent: colors?.primary,
            borderColor: colors?.border,
            text: '#ffffff',
            heading: '#ffffff',
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
            cardBackground: hexToRgba(colors?.primary, 0.75), // 75% opacity
            inputBackground: colors?.background,
            inputText: colors?.heading,
            inputBorder: colors?.border,
        },
        video: {
            background: colors?.surface,
            text: colors?.text,
            heading: colors?.heading,
        },
        howItWorks: {
            background: colors?.background,
            accent: colors?.primary,
            text: colors?.text,
            heading: colors?.heading,
        },
        footer: {
            background: colors?.surface,
            border: colors?.border,
            text: colors?.textMuted,
            linkHover: colors?.primary,
            heading: colors?.heading,
        },
        header: {
            background: colors?.primary,
            text: '#ffffff',
            accent: '#ffffff',
            border: 'transparent',
        },
        menu: {
            background: colors?.background,
            accent: colors?.primary,
            borderColor: colors?.border,
            text: colors?.text,
            heading: colors?.heading,
            cardBackground: colors?.primary,
            cardTitleColor: '#ffffff',
            cardText: 'rgba(255, 255, 255, 0.9)',
            priceColor: colors?.secondary,
        },
        chatbot: {
            // Core colors
            primaryColor: colors?.primary,
            secondaryColor: colors?.secondary,
            accentColor: colors?.accent,
            // Chat bubbles
            userBubbleColor: colors?.primary,
            userTextColor: '#ffffff',
            botBubbleColor: colors?.surface,
            botTextColor: colors?.text,
            // Background and inputs
            backgroundColor: colors?.background,
            inputBackground: colors?.surface,
            inputBorder: colors?.border,
            inputText: colors?.text,
            // Header
            headerBackground: colors?.primary,
            headerText: '#ffffff',
        },
        // Ecommerce components
        featuredProducts: {
            background: colors?.background,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            cardBackground: colors?.surface,
            cardText: colors?.heading,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
            badgeBackground: colors?.primary,
            badgeText: '#ffffff',
            priceColor: colors?.heading,
            salePriceColor: colors?.error,
            overlayStart: 'transparent',
            overlayEnd: 'rgba(0,0,0,0.7)',
            borderColor: colors?.border,
        },
        categoryGrid: {
            background: colors?.background,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            cardBackground: colors?.surface,
            cardText: colors?.heading,
            overlayStart: 'transparent',
            overlayEnd: 'rgba(0,0,0,0.7)',
            borderColor: colors?.border,
        },
        productHero: {
            background: colors?.background,
            overlayColor: '#000000',
            heading: '#ffffff',
            text: '#ffffff',
            accent: colors?.primary,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
            badgeBackground: colors?.error,
            badgeText: '#ffffff',
        },
        trustBadges: {
            background: colors?.surface,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            borderColor: colors?.border,
        },
        saleCountdown: {
            background: colors?.surface,
            heading: '#ffffff',
            text: colors?.textMuted,
            accent: colors?.error,
            countdownBackground: colors?.background,
            countdownText: '#ffffff',
            buttonBackground: colors?.error,
            buttonText: '#ffffff',
            badgeBackground: colors?.error,
            badgeText: '#ffffff',
        },
        announcementBar: {
            background: colors?.primary,
            text: '#ffffff',
            linkColor: '#ffffff',
            iconColor: '#ffffff',
            borderColor: colors?.border,
        },
        collectionBanner: {
            background: colors?.background,
            overlayColor: '#000000',
            heading: '#ffffff',
            text: '#ffffff',
            accent: colors?.primary,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
        },
        recentlyViewed: {
            background: colors?.background,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            cardBackground: colors?.surface,
            cardText: colors?.heading,
        },
        productReviews: {
            background: colors?.background,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            cardBackground: colors?.surface,
            cardText: colors?.heading,
            starColor: '#fbbf24',
            verifiedBadgeColor: colors?.success,
        },
        productBundle: {
            background: colors?.surface,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            cardBackground: colors?.background,
            cardText: colors?.heading,
            priceColor: colors?.heading,
            savingsColor: colors?.success,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
            badgeBackground: colors?.primary,
            badgeText: '#ffffff',
        },
        storeSettings: {
            background: colors?.background,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            cardBackground: colors?.surface,
            cardText: colors?.heading,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
            badgeBackground: colors?.error,
            badgeText: '#ffffff',
            priceColor: colors?.heading,
            salePriceColor: colors?.error,
            borderColor: colors?.border,
            starColor: '#fbbf24',
        },
        // Products grid component
        products: {
            background: colors?.background,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            cardBackground: colors?.surface,
            cardText: colors?.heading,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
        },
        productDetailPage: {
            background: colors?.background,
            heading: colors?.heading,
            text: colors?.text,
            accent: colors?.primary,
            cardBackground: colors?.surface,
            cardText: colors?.heading,
            buttonBackground: colors?.primary,
            buttonText: '#ffffff',
            badgeBackground: colors?.error,
            badgeText: '#ffffff',
            priceColor: colors?.heading,
            salePriceColor: colors?.error,
            borderColor: colors?.border,
            starColor: '#fbbf24',
            linkColor: colors?.primary,
            secondaryButtonBackground: colors?.surface,
            secondaryButtonText: colors?.text,
        },
    };
};

const GlobalStylesControl: React.FC<GlobalStylesControlProps> = ({ mode = 'both' }) => {
    const { t } = useTranslation();
    const { updateComponentStyle } = useAdmin();
    const { theme, setTheme, data, setData } = useProject();
    const [activeTab, setActiveTab] = useState<Tab>('colors');
    const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    const [showCoolorsImporter, setShowCoolorsImporter] = useState(false);

    // Ensure globalColors exists with defaults
    const globalColors = theme.globalColors || getDefaultGlobalColors();

    // Create full array of all palette colors for ColorControl
    // This ensures users can pick any color from the palette, not just the 4 preview colors
    const allPaletteColors = [
        globalColors.primary,
        globalColors.secondary,
        globalColors.accent,
        globalColors.background,
        globalColors.surface,
        globalColors.text,
        globalColors.heading,
        globalColors.textMuted,
        globalColors.border,
        globalColors.success,
        globalColors.error
    ].filter((color, index, self) => self.indexOf(color) === index); // Remove duplicates

    // Determine which content to show based on mode
    const showColors = mode === 'colors' || mode === 'both';
    const showTypography = mode === 'typography' || mode === 'both';
    const showTabs = mode === 'both';

    const handleFontChange = (key: 'fontFamilyHeader' | 'fontFamilyBody' | 'fontFamilyButton', value: FontFamily) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    const handleColorChange = (colorKey: keyof GlobalColors, value: string) => {
        setTheme(prev => ({
            ...prev,
            globalColors: {
                ...(prev.globalColors || getDefaultGlobalColors()),
                [colorKey]: value
            }
        }));
        setSelectedPaletteId(null); // Clear palette selection when custom color is picked
    };

    /**
     * Aplica los colores de la paleta a todos los componentes
     * Actualiza tanto componentStyles como data para asegurar que los colores se apliquen
     */
    const applyPaletteToAllComponents = async (colors: GlobalColors) => {
        const componentColorMappings = generateComponentColorMappings(colors);

        // Aplicar colores a cada componente en componentStyles
        for (const [componentId, componentColors] of Object.entries(componentColorMappings)) {
            await updateComponentStyle(componentId, { colors: componentColors }, false);
        }

        // También actualizar los colores en data para que tengan prioridad en el merge
        if (data && setData) {
            setData((prev: PageData | null) => {
                if (!prev) return prev;

                const newData = { ...prev };

                // Lista de componentes de ecommerce que deben crearse si no existen
                const ecommerceComponents = [
                    'productDetailPage',
                    'storeSettings',
                    'featuredProducts',
                    'categoryGrid',
                    'productHero',
                    'trustBadges',
                    'saleCountdown',
                    'announcementBar',
                    'collectionBanner',
                    'recentlyViewed',
                    'productReviews',
                    'productBundle',
                    'products'
                ];

                // Actualizar colores de cada componente en data
                for (const [componentId, componentColors] of Object.entries(componentColorMappings)) {
                    const key = componentId as keyof PageData;
                    // Si el componente existe y es un objeto, actualizar sus colores
                    if (newData[key] && typeof newData[key] === 'object') {
                        (newData[key] as any) = {
                            ...(newData[key] as any),
                            colors: {
                                ...((newData[key] as any).colors || {}),
                                ...componentColors
                            }
                        };
                    } else if (ecommerceComponents.includes(key)) {
                        // Para componentes de ecommerce que pueden no existir,
                        // crearlos con los colores
                        (newData as any)[key] = {
                            colors: componentColors
                        };
                    }
                }

                return newData;
            });
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
                // Guardar los colores de preview de la paleta para el selector de colores
                paletteColors: palette.preview
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
                // Guardar los colores originales de la paleta para acceso rápido en el selector
                paletteColors: preview
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

    const renderFontSelect = (label: string, key: 'fontFamilyHeader' | 'fontFamilyBody' | 'fontFamilyButton') => (
        <div className="mb-4 last:mb-0">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1.5 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <select
                    value={theme[key] as string}
                    onChange={(e) => handleFontChange(key, e.target.value as FontFamily)}
                    className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2.5 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all appearance-none cursor-pointer hover:border-editor-accent/50"
                >
                    {fontOptions.map(font => (
                        <option key={font} value={font}>
                            {formatFontName(font)}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-editor-text-secondary">
                    <ChevronDown className="h-4 w-4" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Tab Selector - Only show when mode is 'both' */}
            {showTabs && (
                <div className="flex bg-editor-bg rounded-lg p-1 border border-editor-border">
                    <button
                        onClick={() => setActiveTab('colors')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'colors'
                                ? 'bg-editor-accent text-editor-bg shadow-sm'
                                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg/50'
                            }`}
                    >
                        <Palette size={16} />
                        {t('editor.controls.globalStyles.colors', 'Colors')}
                    </button>
                    <button
                        onClick={() => setActiveTab('typography')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'typography'
                                ? 'bg-editor-accent text-editor-bg shadow-sm'
                                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg/50'
                            }`}
                    >
                        <Type size={16} />
                        {t('editor.controls.globalStyles.typography', 'Typography')}
                    </button>
                </div>
            )}

            {/* Colors Content - Show when mode is 'colors' OR when mode is 'both' and activeTab is 'colors' */}
            {(mode === 'colors' || (showTabs && activeTab === 'colors')) && (
                <div className="space-y-5">
                    {/* Coolors.co Importer Section */}
                    <div className="border border-dashed border-purple-500/30 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setShowCoolorsImporter(!showCoolorsImporter)}
                            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Upload size={16} className="text-purple-400" />
                                <span className="text-sm font-medium text-editor-text-primary">
                                </span>
                            </div>
                            <ChevronDown size={14} className={`text-purple-400 transition-transform ${showCoolorsImporter ? 'rotate-180' : ''}`} />
                        </button>

                        {showCoolorsImporter && (
                            <div className="p-4 border-t border-purple-500/20">
                                <CoolorsImporter onPaletteGenerated={handleCoolorsPaletteGenerated} />
                            </div>
                        )}
                    </div>

                    {/* Palettes Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-editor-accent uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={14} />
                                {t('editor.controls.globalStyles.presetPalettes', 'Preset Palettes')}
                            </label>
                            <button
                                onClick={handleResetColors}
                                disabled={isApplying}
                                className="text-xs text-editor-text-secondary hover:text-editor-accent flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Restablecer colores"
                            >
                                <RotateCcw size={12} className={isApplying ? 'animate-spin' : ''} />
                                {t('editor.controls.globalStyles.reset', 'Reset')}
                            </button>
                        </div>

                        {/* Info Banner */}
                        <div className="mb-3 p-2.5 bg-editor-accent/10 border border-editor-accent/30 rounded-lg">
                            <p className="text-xs text-editor-accent flex items-start gap-2">
                                <Info size={14} className="flex-shrink-0 mt-0.5" />
                                <span>
                                    {t('editor.controls.globalStyles.infoBanner', 'When selecting a palette, colors will be applied to **all components**. You can then customize them individually from each section\'s controls.')}
                                </span>
                            </p>
                        </div>

                        {/* Re-apply colors button */}
                        <button
                            onClick={() => applyPaletteToAllComponents(globalColors)}
                            disabled={isApplying}
                            className="w-full mb-3 py-2.5 px-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 border border-purple-500/30 rounded-lg text-sm font-medium text-purple-300 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isApplying ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Sparkles size={14} />
                            )}
                            {t('editor.controls.globalStyles.reapplyColors', 'Re-apply colors to all components')}
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            {colorPalettes.map((palette) => (
                                <button
                                    key={palette.id}
                                    onClick={() => handlePaletteSelect(palette)}
                                    disabled={isApplying}
                                    className={`relative p-2.5 rounded-lg border transition-all text-left group ${selectedPaletteId === palette.id
                                            ? 'border-editor-accent ring-1 ring-editor-accent bg-editor-accent/10'
                                            : 'border-editor-border hover:border-editor-accent/50 bg-editor-bg hover:bg-editor-panel-bg/50'
                                        } ${isApplying ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                                >
                                    {/* Selection indicator */}
                                    {selectedPaletteId === palette.id && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-editor-accent rounded-full flex items-center justify-center">
                                            {isApplying ? (
                                                <Loader2 size={10} className="text-editor-bg animate-spin" />
                                            ) : (
                                                <Check size={10} className="text-editor-bg" />
                                            )}
                                        </div>
                                    )}

                                    {/* Color Preview */}
                                    <div className="flex gap-1 mb-2">
                                        {palette.preview.map((color, idx) => (
                                            <div
                                                key={idx}
                                                className="w-5 h-5 rounded-md border border-white/10 shadow-sm"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>

                                    {/* Palette Name */}
                                    <p className="text-xs font-medium text-editor-text-primary truncate">
                                        {palette.nameEs}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <hr className="border-editor-border/50" />

                    {/* Custom Colors Section */}
                    <div>
                        <label className="block text-xs font-bold text-editor-text-secondary mb-3 uppercase tracking-wider flex items-center gap-2">
                            <Grid size={14} />
                            {t('editor.controls.globalStyles.customColors', 'Custom Colors')}
                        </label>

                        <div className="space-y-4">
                            {/* Primary Colors */}
                            <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                                <p className="text-xs font-semibold text-editor-text-primary mb-3">{t('editor.controls.globalStyles.mainColors', 'Main Colors')}</p>
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
                            <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                                <p className="text-xs font-semibold text-editor-text-primary mb-3">{t('editor.controls.globalStyles.backgrounds', 'Backgrounds')}</p>
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

                            {/* Text Colors */}
                            <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                                <p className="text-xs font-semibold text-editor-text-primary mb-3">{t('editor.controls.globalStyles.textColors', 'Text')}</p>
                                <div className="grid grid-cols-2 gap-3">
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
                                </div>
                                <div className="mt-3">
                                    <ColorControl
                                        label={t('editor.controls.globalStyles.textSecondary', 'Secondary Text')}
                                        value={globalColors.textMuted}
                                        onChange={(v) => handleColorChange('textMuted', v)}
                                        paletteColors={allPaletteColors}
                                    />
                                </div>
                            </div>

                            {/* Border & Status Colors */}
                            <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                                <p className="text-xs font-semibold text-editor-text-primary mb-3">{t('editor.controls.globalStyles.bordersStates', 'Borders & States')}</p>
                                <div className="grid grid-cols-3 gap-3">
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
                    <div className="bg-editor-panel-bg/30 p-4 rounded-lg border border-editor-border">
                        <label className="block text-xs font-bold text-editor-accent mb-4 uppercase tracking-wider flex items-center gap-2">
                            <Type size={14} />
                            {t('editor.controls.globalStyles.globalFonts', 'Global Fonts')}
                        </label>
                        {renderFontSelect(t('editor.controls.globalStyles.headingsFont', 'Headings'), 'fontFamilyHeader')}
                        {renderFontSelect(t('editor.controls.globalStyles.bodyFont', 'Body'), 'fontFamilyBody')}
                        {renderFontSelect(t('editor.controls.globalStyles.buttonsFont', 'Buttons'), 'fontFamilyButton')}

                        {/* All Caps Toggles Section */}
                        <div className="mt-4 pt-4 border-t border-editor-border/50 space-y-4">
                            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('editor.controls.globalStyles.allCapsOptions', 'All Caps')}
                            </label>

                            {/* Headings All Caps */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm text-editor-text-primary">
                                        {t('editor.controls.globalStyles.headingsAllCaps', 'Headings')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setTheme(prev => ({ ...prev, headingsAllCaps: !prev.headingsAllCaps }))}
                                    className={`${theme.headingsAllCaps ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                                >
                                    <span
                                        className={`${theme.headingsAllCaps ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>

                            {/* Buttons All Caps */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm text-editor-text-primary">
                                        {t('editor.controls.globalStyles.buttonsAllCaps', 'Buttons')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setTheme(prev => ({ ...prev, buttonsAllCaps: !prev.buttonsAllCaps }))}
                                    className={`${theme.buttonsAllCaps ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                                >
                                    <span
                                        className={`${theme.buttonsAllCaps ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>

                            {/* Nav Links All Caps */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm text-editor-text-primary">
                                        {t('editor.controls.globalStyles.navLinksAllCaps', 'Navigation Links')}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setTheme(prev => ({ ...prev, navLinksAllCaps: !prev.navLinksAllCaps }))}
                                    className={`${theme.navLinksAllCaps ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                                >
                                    <span
                                        className={`${theme.navLinksAllCaps ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Font Preview */}
                    <div className="p-4 rounded-lg border border-editor-border bg-editor-bg">
                        <p className="text-xs text-editor-text-secondary mb-3 uppercase tracking-wider font-bold">
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
                            <div className="flex gap-4 mb-4 pb-3 border-b border-white/10">
                                {[t('editor.controls.globalStyles.navLinks.home', 'Home'), t('editor.controls.globalStyles.navLinks.services', 'Services'), t('editor.controls.globalStyles.navLinks.contact', 'Contact')].map((link) => (
                                    <span
                                        key={link}
                                        className="text-sm"
                                        style={{
                                            fontFamily: getFontStack(theme.fontFamilyHeader || 'poppins'),
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
                                    fontFamily: getFontStack(theme.fontFamilyHeader || 'poppins'),
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
                                    fontFamily: getFontStack(theme.fontFamilyBody || 'mulish'),
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
                    <div className="p-3 rounded-lg border border-editor-accent/30 bg-editor-accent/5">
                        <p className="text-xs text-editor-accent font-medium mb-1">💡 {t('editor.controls.globalStyles.tip', 'Tip')}</p>
                        <p className="text-xs text-editor-text-secondary">
                            {t('editor.controls.globalStyles.tipContent', 'For a professional design, use different fonts for headings and body text. For example: Playfair Display for headings and Lato for body.')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalStylesControl;
