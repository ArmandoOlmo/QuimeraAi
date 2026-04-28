/**
 * GlobalStylesControls
 * Controls for editing global email styles (fonts, colors, etc.)
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import ColorControl from '../../../../ui/ColorControl';
import { useSafeProject } from '../../../../../contexts/project/ProjectContext';
import { Button } from '../../../../ui/button';
import { useToast } from '../../../../../contexts/ToastContext';
import { Palette, Download, Sparkles } from 'lucide-react';
import { loadAllFonts } from '../../../../../utils/fontLoader';
import { FontFamily } from '../../../../../types';
import FontFamilyPicker from '../../../../ui/FontFamilyPicker';

// =============================================================================
// QUIMERA.AI BRAND PALETTE (from main.css design system)
// =============================================================================
const QUIMERA_BRAND_COLORS = {
    // Primary accent
    primary: '#FBB92B',         // Cadmium Yellow — editor-accent / primary
    primaryDark: '#E5A825',     // Darker yellow for contrast

    // Blue Violet palette
    violet500: '#7f22dd',
    violet600: '#661cb0',
    violet400: '#994fe3',
    violet300: '#b27bea',

    // Amber Glow palette
    amber500: '#ff9d00',
    amber400: '#ffb133',
    amber300: '#ffc466',

    // Emerald Teal palette
    emerald500: '#10b981',
    emerald600: '#059669',
    emerald400: '#34d399',

    // Rose Coral palette
    rose500: '#f43f5e',
    rose600: '#e11d48',
    rose400: '#fb7185',

    // Backgrounds & Neutrals
    bgLight: '#F5F4F0',
    bgDark: '#0F0F0F',
    panelLight: '#FDFCFA',
    textDark: '#161412',
    textMuted: '#4A4640',
    borderLight: '#D1CEC5',
    white: '#FFFFFF',
    black: '#000000',
};

/** Flat array of Quimera brand colors for the palette swatches */
const QUIMERA_PALETTE: string[] = [
    QUIMERA_BRAND_COLORS.primary,
    QUIMERA_BRAND_COLORS.violet500,
    QUIMERA_BRAND_COLORS.amber500,
    QUIMERA_BRAND_COLORS.emerald500,
    QUIMERA_BRAND_COLORS.rose500,
    QUIMERA_BRAND_COLORS.violet400,
    QUIMERA_BRAND_COLORS.amber400,
    QUIMERA_BRAND_COLORS.emerald400,
    QUIMERA_BRAND_COLORS.rose400,
    QUIMERA_BRAND_COLORS.violet300,
    QUIMERA_BRAND_COLORS.amber300,
    QUIMERA_BRAND_COLORS.textDark,
    QUIMERA_BRAND_COLORS.textMuted,
    QUIMERA_BRAND_COLORS.bgLight,
    QUIMERA_BRAND_COLORS.white,
    QUIMERA_BRAND_COLORS.black,
];

// =============================================================================
// HELPER COMPONENTS (following Controls.tsx pattern)
// =============================================================================

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h4 className="text-sm font-bold text-q-text mb-3 pb-2 border-b border-q-border">
        {children}
    </h4>
);

const SelectControl: React.FC<{
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">
            {label}
        </label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

const BorderRadiusSelector: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
}> = ({ label, value, onChange }) => {
    const options = [
        { v: 'none', l: '0' },
        { v: 'sm', l: 'SM' },
        { v: 'md', l: 'MD' },
        { v: 'lg', l: 'LG' },
        { v: 'xl', l: 'XL' },
    ];

    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">
                {label}
            </label>
            <div className="flex bg-q-surface rounded-md border border-q-border p-1">
                {options.map((opt) => (
                    <button
                        key={opt.v}
                        onClick={() => onChange(opt.v)}
                        className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === opt.v
                            ? 'bg-q-accent text-q-bg'
                            : 'text-q-text-secondary hover:text-q-text hover:bg-q-bg'
                            }`}
                    >
                        {opt.l}
                    </button>
                ))}
            </div>
        </div>
    );
};


// =============================================================================
// COMPONENT
// =============================================================================

const GlobalStylesControls: React.FC = () => {
    const { t } = useTranslation();
    const { document, updateGlobalStyles, setDocument } = useEmailEditor();
    const { globalStyles } = document;
    const { activeProject } = useSafeProject();
    const { showToast } = useToast();

    // Preload ALL Google Fonts for dropdown preview (same as Web Editor)
    useEffect(() => {
        loadAllFonts();
    }, []);

    // Derive palette: prefer project colors, fall back to Quimera.ai brand palette
    const hasProjectColors = !!(activeProject?.theme?.globalColors);
    const projectPalette = React.useMemo(() => {
        if (activeProject?.theme?.globalColors) {
            const { primary, secondary, background, text } = activeProject.theme.globalColors;
            return [primary, secondary, background, text].filter(Boolean) as string[];
        }
        // Fallback: always provide Quimera.ai brand palette
        return QUIMERA_PALETTE;
    }, [activeProject]);

    /** Import project-specific colors (when inside a project) */
    const handleImportProjectColors = () => {
        if (!activeProject || !activeProject.theme || !activeProject.theme.globalColors) {
            showToast('No se encontraron colores del proyecto', 'error');
            return;
        }

        const projectColors = activeProject.theme.globalColors;

        const newGlobalStyles = {
            primaryColor: projectColors.primary,
            secondaryColor: projectColors.secondary,
            backgroundColor: projectColors.background,
            textColor: projectColors.text,
            headingColor: projectColors.text,
            linkColor: projectColors.primary,
        };

        setDocument(prev => {
            const updatedBlocks = prev.blocks.map(block => {
                const newStyles = { ...block.styles };

                switch (block.type) {
                    case 'button':
                        newStyles.buttonColor = projectColors.primary;
                        newStyles.buttonTextColor = '#ffffff';
                        break;
                    case 'hero':
                        newStyles.buttonColor = projectColors.primary;
                        newStyles.buttonTextColor = '#ffffff';
                        break;
                    case 'products':
                        newStyles.buttonColor = projectColors.primary;
                        newStyles.buttonTextColor = '#ffffff';
                        break;
                    case 'divider':
                        newStyles.borderColor = projectColors.secondary || '#e4e4e7';
                        break;
                    case 'footer':
                        newStyles.backgroundColor = projectColors.background === '#ffffff' ? '#f4f4f5' : projectColors.background;
                        newStyles.textColor = projectColors.text;
                        break;
                    case 'text':
                        newStyles.textColor = projectColors.text;
                        break;
                }

                return { ...block, styles: newStyles };
            });

            return {
                ...prev,
                globalStyles: { ...prev.globalStyles, ...newGlobalStyles },
                blocks: updatedBlocks
            };
        });

        showToast('Colores del proyecto importados correctamente', 'success');
    };

    /** Import Quimera.ai brand colors (always available, especially in Admin mode) */
    const handleImportQuimeraColors = () => {
        const newGlobalStyles = {
            primaryColor: QUIMERA_BRAND_COLORS.primary,
            secondaryColor: QUIMERA_BRAND_COLORS.violet500,
            backgroundColor: QUIMERA_BRAND_COLORS.white,
            bodyBackgroundColor: QUIMERA_BRAND_COLORS.bgLight,
            textColor: QUIMERA_BRAND_COLORS.textDark,
            headingColor: QUIMERA_BRAND_COLORS.textDark,
            linkColor: QUIMERA_BRAND_COLORS.primary,
        };

        setDocument(prev => {
            const updatedBlocks = prev.blocks.map(block => {
                const newStyles = { ...block.styles };

                switch (block.type) {
                    case 'button':
                        newStyles.buttonColor = QUIMERA_BRAND_COLORS.primary;
                        newStyles.buttonTextColor = QUIMERA_BRAND_COLORS.textDark;
                        break;
                    case 'hero':
                        newStyles.backgroundColor = QUIMERA_BRAND_COLORS.violet500;
                        newStyles.headingColor = QUIMERA_BRAND_COLORS.white;
                        newStyles.textColor = QUIMERA_BRAND_COLORS.white;
                        newStyles.buttonColor = QUIMERA_BRAND_COLORS.primary;
                        newStyles.buttonTextColor = QUIMERA_BRAND_COLORS.textDark;
                        break;
                    case 'products':
                        newStyles.buttonColor = QUIMERA_BRAND_COLORS.primary;
                        newStyles.buttonTextColor = QUIMERA_BRAND_COLORS.textDark;
                        break;
                    case 'divider':
                        newStyles.borderColor = QUIMERA_BRAND_COLORS.borderLight;
                        break;
                    case 'footer':
                        newStyles.backgroundColor = QUIMERA_BRAND_COLORS.bgLight;
                        newStyles.textColor = QUIMERA_BRAND_COLORS.textMuted;
                        break;
                    case 'text':
                        newStyles.textColor = QUIMERA_BRAND_COLORS.textDark;
                        break;
                }

                return { ...block, styles: newStyles };
            });

            return {
                ...prev,
                globalStyles: { ...prev.globalStyles, ...newGlobalStyles },
                blocks: updatedBlocks,
            };
        });

        showToast('Colores de Quimera.ai importados correctamente ✨', 'success');
    };

    return (
        <div className="space-y-6">
            {/* Quimera.ai Brand Import — always available */}
            <div className="p-4 bg-gradient-to-br from-[#FBB92B]/10 via-[#7f22dd]/10 to-[#10b981]/10 border border-q-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[#FBB92B]" />
                    <h4 className="text-sm font-bold text-q-text">
                        Quimera.ai Brand
                    </h4>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {QUIMERA_PALETTE.slice(0, 12).map((color, i) => (
                        <div
                            key={i}
                            className="w-5 h-5 rounded-full border border-q-border shadow-sm cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            title={color}
                            onClick={() => {
                                navigator.clipboard.writeText(color);
                                showToast(`Color ${color} copiado`, 'success');
                            }}
                        />
                    ))}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-[#FBB92B]/30 hover:bg-[#FBB92B]/10 hover:border-[#FBB92B]/50 text-q-text"
                    onClick={handleImportQuimeraColors}
                >
                    <Sparkles className="w-3 h-3 text-[#FBB92B]" />
                    Aplicar Colores Quimera.ai
                </Button>
            </div>

            {/* Project Style Import — only when inside a project */}
            {hasProjectColors && (
                <div className="p-4 bg-q-surface border border-q-border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <Palette className="w-4 h-4 text-q-accent" />
                        <h4 className="text-sm font-bold text-q-text">
                            {t('email.projectStyles', 'Estilos del Proyecto')}
                        </h4>
                    </div>
                    <p className="text-xs text-q-text-secondary mb-3">
                        {t('email.importStylesHint', 'Importa los colores de tu sitio web para mantener la consistencia de marca.')}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 border-q-border hover:bg-q-bg"
                        onClick={handleImportProjectColors}
                    >
                        <Download className="w-3 h-3" />
                        {t('email.importColors', 'Importar Colores')}
                    </Button>
                </div>
            )}

            {/* Typography */}
            <div>
                <SectionTitle>{t('email.typography', 'Tipografía')}</SectionTitle>
                <FontFamilyPicker
                    label={t('email.fontFamily', 'Fuente')}
                    value={globalStyles.fontFamily as FontFamily}
                    onChange={(font) => updateGlobalStyles({ fontFamily: font })}
                />
            </div>

            {/* Colors */}
            <div>
                <SectionTitle>{t('email.colors', 'Colores')}</SectionTitle>

                <ColorControl
                    label={t('email.primaryColor', 'Color primario')}
                    value={globalStyles.primaryColor}
                    onChange={(value) => updateGlobalStyles({ primaryColor: value })}
                    paletteColors={projectPalette}
                />

                <ColorControl
                    label={t('email.secondaryColor', 'Color secundario')}
                    value={globalStyles.secondaryColor || globalStyles.primaryColor}
                    onChange={(value) => updateGlobalStyles({ secondaryColor: value })}
                    paletteColors={projectPalette}
                />

                <ColorControl
                    label={t('email.backgroundColor', 'Fondo del email')}
                    value={globalStyles.backgroundColor}
                    onChange={(value) => updateGlobalStyles({ backgroundColor: value })}
                    paletteColors={projectPalette}
                />

                <ColorControl
                    label={t('email.bodyBackgroundColor', 'Fondo exterior')}
                    value={globalStyles.bodyBackgroundColor}
                    onChange={(value) => updateGlobalStyles({ bodyBackgroundColor: value })}
                    paletteColors={projectPalette}
                />

                <ColorControl
                    label={t('email.headingColor', 'Color de títulos')}
                    value={globalStyles.headingColor}
                    onChange={(value) => updateGlobalStyles({ headingColor: value })}
                    paletteColors={projectPalette}
                />

                <ColorControl
                    label={t('email.textColor', 'Color de texto')}
                    value={globalStyles.textColor}
                    onChange={(value) => updateGlobalStyles({ textColor: value })}
                    paletteColors={projectPalette}
                />

                <ColorControl
                    label={t('email.linkColor', 'Color de enlaces')}
                    value={globalStyles.linkColor}
                    onChange={(value) => updateGlobalStyles({ linkColor: value })}
                    paletteColors={projectPalette}
                />
            </div>

            {/* Border Radius */}
            <div>
                <SectionTitle>{t('email.borderRadius', 'Bordes redondeados')}</SectionTitle>
                <BorderRadiusSelector
                    label={t('email.defaultBorderRadius', 'Radio por defecto')}
                    value={globalStyles.borderRadius}
                    onChange={(value) => updateGlobalStyles({ borderRadius: value as any })}
                />
                <p className="text-xs text-q-text-secondary">
                    {t('email.borderRadiusHint', 'Se aplica a botones y tarjetas por defecto')}
                </p>
            </div>
        </div>
    );
};

export default GlobalStylesControls;
