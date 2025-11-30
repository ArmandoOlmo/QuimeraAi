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

const formatFontName = (font: string) => {
    return font.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

type Tab = 'typography' | 'colors';

interface GlobalStylesControlProps {
    mode?: GlobalStylesMode;
}

/**
 * Genera el mapeo de colores de la paleta global a cada componente
 */
const generateComponentColorMappings = (colors: GlobalColors): Record<string, Record<string, string>> => {
    return {
        hero: {
            primary: colors.primary,
            secondary: colors.secondary,
            background: colors.background,
            text: colors.text,
            heading: colors.heading,
            buttonBackground: colors.primary,
            buttonText: '#ffffff',
            secondaryButtonBackground: colors.surface,
            secondaryButtonText: colors.text,
        },
        features: {
            background: colors.background,
            accent: colors.primary,
            borderColor: colors.border,
            text: colors.text,
            heading: colors.heading,
            cardBackground: colors.primary,
        },
        testimonials: {
            background: colors.surface,
            accent: colors.primary,
            borderColor: colors.border,
            text: colors.text,
            heading: colors.heading,
            cardBackground: colors.primary,
        },
        cta: {
            gradientStart: colors.primary,
            gradientEnd: colors.secondary,
            text: colors.text,
            heading: colors.heading,
            buttonBackground: '#ffffff',
            buttonText: colors.primary,
        },
        services: {
            background: colors.surface,
            accent: colors.primary,
            borderColor: colors.border,
            text: colors.text,
            heading: colors.heading,
        },
        team: {
            background: colors.background,
            text: colors.text,
            heading: colors.heading,
            accent: colors.primary,
            cardBackground: colors.surface,
        },
        slideshow: {
            background: colors.surface,
            heading: colors.heading,
            arrowBackground: 'rgba(0, 0, 0, 0.5)',
            arrowText: '#ffffff',
            dotActive: '#ffffff',
            dotInactive: 'rgba(255, 255, 255, 0.5)',
            captionBackground: 'rgba(0, 0, 0, 0.7)',
            captionText: '#ffffff',
        },
        pricing: {
            background: colors.background,
            accent: colors.primary,
            borderColor: colors.border,
            text: colors.text,
            heading: colors.heading,
            buttonBackground: colors.primary,
            buttonText: '#ffffff',
            gradientStart: colors.primary,
            gradientEnd: colors.secondary,
            cardBackground: colors.surface,
        },
        faq: {
            background: colors.secondary,
            accent: colors.primary,
            borderColor: colors.border,
            text: '#ffffff',
            heading: '#ffffff',
            cardBackground: colors.secondary,
            gradientStart: colors.primary,
            gradientEnd: colors.secondary,
        },
        portfolio: {
            background: colors.background,
            accent: colors.primary,
            borderColor: colors.border,
            text: colors.text,
            heading: colors.heading,
        },
        leads: {
            background: colors.background,
            accent: colors.primary,
            borderColor: colors.border,
            text: colors.text,
            heading: colors.heading,
            buttonBackground: colors.primary,
            buttonText: '#ffffff',
            cardBackground: colors.primary,
            inputBackground: colors.background,
            inputText: colors.heading,
            inputBorder: colors.border,
            gradientStart: colors.primary,
            gradientEnd: colors.secondary,
        },
        newsletter: {
            background: colors.surface,
            accent: colors.primary,
            borderColor: colors.border,
            text: colors.text,
            heading: colors.heading,
            buttonBackground: colors.primary,
            buttonText: '#ffffff',
            cardBackground: hexToRgba(colors.primary, 0.75), // 75% opacity
        },
        video: {
            background: colors.surface,
            text: colors.text,
            heading: colors.heading,
        },
        howItWorks: {
            background: colors.background,
            accent: colors.primary,
            text: colors.text,
            heading: colors.heading,
        },
        footer: {
            background: colors.surface,
            border: colors.border,
            text: colors.textMuted,
            linkHover: colors.primary,
            heading: colors.heading,
        },
        header: {
            background: '#ffffff',
            text: colors.background,
            accent: colors.primary,
            border: 'transparent',
        },
        menu: {
            background: colors.background,
            accent: colors.primary,
            borderColor: colors.border,
            text: colors.text,
            heading: colors.heading,
            cardBackground: colors.primary,
            priceColor: colors.secondary,
        },
        chatbot: {
            primary: colors.primary,
            text: '#ffffff',
            background: colors.background,
        },
    };
};

const GlobalStylesControl: React.FC<GlobalStylesControlProps> = ({ mode = 'both' }) => {
    const { t } = useTranslation();
    const { theme, setTheme, updateComponentStyle, data, setData } = useEditor();
    const [activeTab, setActiveTab] = useState<Tab>('colors');
    const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    const [showCoolorsImporter, setShowCoolorsImporter] = useState(false);

    // Ensure globalColors exists with defaults
    const globalColors = theme.globalColors || getDefaultGlobalColors();
    
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
                
                // Actualizar colores de cada componente en data
                for (const [componentId, componentColors] of Object.entries(componentColorMappings)) {
                    const key = componentId as keyof PageData;
                    if (newData[key] && typeof newData[key] === 'object') {
                        (newData[key] as any) = {
                            ...(newData[key] as any),
                            colors: {
                                ...((newData[key] as any).colors || {}),
                                ...componentColors
                            }
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
                pageBackground: palette.colors.background,
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
                pageBackground: colors.background,
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
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
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
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                            activeTab === 'colors'
                                ? 'bg-editor-accent text-editor-bg shadow-sm'
                                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg/50'
                        }`}
                    >
                        <Palette size={16} />
                        {t('globalStyles.colors', 'Colores')}
                    </button>
                    <button
                        onClick={() => setActiveTab('typography')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                            activeTab === 'typography'
                                ? 'bg-editor-accent text-editor-bg shadow-sm'
                                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg/50'
                        }`}
                    >
                        <Type size={16} />
                        {t('globalStyles.typography', 'Tipografía')}
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
                                    {t('globalStyles.importFromCoolors', 'Importar paleta de Coolors.co')}
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
                                {t('globalStyles.presetPalettes', 'Paletas Predefinidas')}
                            </label>
                            <button
                                onClick={handleResetColors}
                                disabled={isApplying}
                                className="text-xs text-editor-text-secondary hover:text-editor-accent flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Restablecer colores"
                            >
                                <RotateCcw size={12} className={isApplying ? 'animate-spin' : ''} />
                                Reset
                            </button>
                        </div>

                        {/* Info Banner */}
                        <div className="mb-3 p-2.5 bg-editor-accent/10 border border-editor-accent/30 rounded-lg">
                            <p className="text-xs text-editor-accent flex items-start gap-2">
                                <Info size={14} className="flex-shrink-0 mt-0.5" />
                                <span>
                                    Al seleccionar una paleta, los colores se aplicarán a <strong>todos los componentes</strong>. 
                                    Luego puedes personalizarlos individualmente desde los controles de cada sección.
                                </span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {colorPalettes.map((palette) => (
                                <button
                                    key={palette.id}
                                    onClick={() => handlePaletteSelect(palette)}
                                    disabled={isApplying}
                                    className={`relative p-2.5 rounded-lg border transition-all text-left group ${
                                        selectedPaletteId === palette.id
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
                            {t('globalStyles.customColors', 'Colores Personalizados')}
                        </label>
                        
                        <div className="space-y-4">
                            {/* Primary Colors */}
                            <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                                <p className="text-xs font-semibold text-editor-text-primary mb-3">Colores Principales</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorControl
                                        label="Primario"
                                        value={globalColors.primary}
                                        onChange={(v) => handleColorChange('primary', v)}
                                        paletteColors={theme.paletteColors}
                                    />
                                    <ColorControl
                                        label="Secundario"
                                        value={globalColors.secondary}
                                        onChange={(v) => handleColorChange('secondary', v)}
                                        paletteColors={theme.paletteColors}
                                    />
                                </div>
                                <div className="mt-3">
                                    <ColorControl
                                        label="Acento"
                                        value={globalColors.accent}
                                        onChange={(v) => handleColorChange('accent', v)}
                                        paletteColors={theme.paletteColors}
                                    />
                                </div>
                            </div>

                            {/* Background Colors */}
                            <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                                <p className="text-xs font-semibold text-editor-text-primary mb-3">Fondos</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorControl
                                        label="Fondo Principal"
                                        value={globalColors.background}
                                        onChange={(v) => {
                                            handleColorChange('background', v);
                                            setTheme(prev => ({ ...prev, pageBackground: v }));
                                        }}
                                        paletteColors={theme.paletteColors}
                                    />
                                    <ColorControl
                                        label="Superficie"
                                        value={globalColors.surface}
                                        onChange={(v) => handleColorChange('surface', v)}
                                        paletteColors={theme.paletteColors}
                                    />
                                </div>
                            </div>

                            {/* Text Colors */}
                            <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                                <p className="text-xs font-semibold text-editor-text-primary mb-3">Texto</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorControl
                                        label="Texto"
                                        value={globalColors.text}
                                        onChange={(v) => handleColorChange('text', v)}
                                        paletteColors={theme.paletteColors}
                                    />
                                    <ColorControl
                                        label="Títulos"
                                        value={globalColors.heading}
                                        onChange={(v) => handleColorChange('heading', v)}
                                        paletteColors={theme.paletteColors}
                                    />
                                </div>
                                <div className="mt-3">
                                    <ColorControl
                                        label="Texto Secundario"
                                        value={globalColors.textMuted}
                                        onChange={(v) => handleColorChange('textMuted', v)}
                                        paletteColors={theme.paletteColors}
                                    />
                                </div>
                            </div>

                            {/* Border & Status Colors */}
                            <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                                <p className="text-xs font-semibold text-editor-text-primary mb-3">Bordes y Estados</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <ColorControl
                                        label="Bordes"
                                        value={globalColors.border}
                                        onChange={(v) => handleColorChange('border', v)}
                                        paletteColors={theme.paletteColors}
                                    />
                                    <ColorControl
                                        label="Éxito"
                                        value={globalColors.success}
                                        onChange={(v) => handleColorChange('success', v)}
                                        paletteColors={theme.paletteColors}
                                    />
                                    <ColorControl
                                        label="Error"
                                        value={globalColors.error}
                                        onChange={(v) => handleColorChange('error', v)}
                                        paletteColors={theme.paletteColors}
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
                            {t('globalStyles.globalFonts', 'Fuentes Globales')}
                        </label>
                        {renderFontSelect(t('globalStyles.headingsFont', 'Títulos / Headings'), 'fontFamilyHeader')}
                        {renderFontSelect(t('globalStyles.bodyFont', 'Texto / Body'), 'fontFamilyBody')}
                        {renderFontSelect(t('globalStyles.buttonsFont', 'Botones / UI'), 'fontFamilyButton')}
                    </div>

                    {/* Font Preview */}
                    <div className="p-4 rounded-lg border border-editor-border bg-editor-bg">
                        <p className="text-xs text-editor-text-secondary mb-3 uppercase tracking-wider font-bold">
                            {t('globalStyles.preview', 'Vista Previa')}
                        </p>
                        <div 
                            className="p-4 rounded-lg"
                            style={{ 
                                backgroundColor: globalColors.background,
                                borderColor: globalColors.border,
                                borderWidth: '1px'
                            }}
                        >
                            <h3 
                                className="text-xl mb-2"
                                style={{ 
                                    fontFamily: formatFontName(theme.fontFamilyHeader || 'poppins'),
                                    color: globalColors.heading
                                }}
                            >
                                Título de Ejemplo
                            </h3>
                            <p 
                                className="text-sm mb-4"
                                style={{ 
                                    fontFamily: formatFontName(theme.fontFamilyBody || 'mulish'),
                                    color: globalColors.text
                                }}
                            >
                                Este es un párrafo de ejemplo para visualizar cómo se verá el texto del cuerpo en tu sitio web.
                            </p>
                            <button 
                                className="px-4 py-2 rounded-md text-sm font-medium"
                                style={{ 
                                    fontFamily: formatFontName(theme.fontFamilyButton || 'poppins'),
                                    backgroundColor: globalColors.primary,
                                    color: '#ffffff'
                                }}
                            >
                                Botón de Ejemplo
                            </button>
                        </div>
                    </div>

                    {/* Typography Tips */}
                    <div className="p-3 rounded-lg border border-editor-accent/30 bg-editor-accent/5">
                        <p className="text-xs text-editor-accent font-medium mb-1">💡 Tip</p>
                        <p className="text-xs text-editor-text-secondary">
                            Para un diseño profesional, usa fuentes diferentes para títulos y texto. 
                            Por ejemplo: <strong>Playfair Display</strong> para títulos y <strong>Lato</strong> para texto.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalStylesControl;
