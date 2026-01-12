/**
 * GlobalStylesControls
 * Controls for editing global email styles (fonts, colors, etc.)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import ColorControl from '../../../../ui/ColorControl';
import { useSafeProject } from '../../../../../contexts/project/ProjectContext';
import { Button } from '../../../../ui/button';
import { useToast } from '../../../../../contexts/ToastContext';
import { Palette, Download } from 'lucide-react';

// =============================================================================
// HELPER COMPONENTS (following Controls.tsx pattern)
// =============================================================================

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h4 className="text-sm font-bold text-editor-text-primary mb-3 pb-2 border-b border-editor-border">
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
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
            {label}
        </label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
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
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                {label}
            </label>
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
                {options.map((opt) => (
                    <button
                        key={opt.v}
                        onClick={() => onChange(opt.v)}
                        className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === opt.v
                            ? 'bg-editor-accent text-editor-bg'
                            : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
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
// FONT OPTIONS
// =============================================================================

const FONT_OPTIONS = [
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Times New Roman, Times, serif', label: 'Times New Roman' },
    { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'Courier New, monospace', label: 'Courier New' },
    { value: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', label: 'System UI' },
];

// =============================================================================
// COMPONENT
// =============================================================================

const GlobalStylesControls: React.FC = () => {
    const { t } = useTranslation();
    const { document, updateGlobalStyles, setDocument } = useEmailEditor();
    const { globalStyles } = document;
    const { activeProject } = useSafeProject();
    const { showToast } = useToast();

    // Derive palette from project global colors for the Color Picker
    const projectPalette = React.useMemo(() => {
        if (!activeProject?.theme?.globalColors) return [];
        const { primary, secondary, background, text } = activeProject.theme.globalColors;
        return [primary, secondary, background, text].filter(Boolean) as string[];
    }, [activeProject]);

    const handleImportProjectColors = () => {
        if (!activeProject || !activeProject.theme || !activeProject.theme.globalColors) {
            showToast('No se encontraron colores del proyecto', 'error');
            return;
        }

        const projectColors = activeProject.theme.globalColors;

        // Map project colors to email global styles
        // Map project colors to email global styles
        const newGlobalStyles = {
            primaryColor: projectColors.primary,
            secondaryColor: projectColors.secondary,
            backgroundColor: projectColors.background,
            textColor: projectColors.text,
            headingColor: projectColors.text,
            linkColor: projectColors.primary,
        };

        // Update document with both global styles AND block styles
        setDocument(prev => {
            // Update individual blocks to match new theme
            const updatedBlocks = prev.blocks.map(block => {
                const newStyles = { ...block.styles };

                switch (block.type) {
                    case 'button':
                        newStyles.buttonColor = projectColors.primary;
                        newStyles.buttonTextColor = '#ffffff'; // Default contrast
                        break;
                    case 'hero':
                        newStyles.buttonColor = projectColors.primary;
                        newStyles.buttonTextColor = '#ffffff';
                        // Optional: Update background if it was generic? 
                        // For now let's keep hero background as is unless it matches old primary, 
                        // but that's hard to track. Let's just update buttons for consistency.
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

    return (
        <div className="space-y-6">
            {/* Project Style Import */}
            <div className="p-4 bg-editor-panel-bg border border-editor-border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4 text-editor-accent" />
                    <h4 className="text-sm font-bold text-editor-text-primary">
                        {t('email.projectStyles', 'Estilos del Proyecto')}
                    </h4>
                </div>
                <p className="text-xs text-editor-text-secondary mb-3">
                    {t('email.importStylesHint', 'Importa los colores de tu sitio web para mantener la consistencia de marca.')}
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-editor-border hover:bg-editor-bg"
                    onClick={handleImportProjectColors}
                >
                    <Download className="w-3 h-3" />
                    {t('email.importColors', 'Importar Colores')}
                </Button>
            </div>
            {/* Typography */}
            <div>
                <SectionTitle>{t('email.typography', 'Tipografía')}</SectionTitle>
                <SelectControl
                    label={t('email.fontFamily', 'Fuente')}
                    value={globalStyles.fontFamily}
                    options={FONT_OPTIONS}
                    onChange={(value) => updateGlobalStyles({ fontFamily: value })}
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
                <p className="text-xs text-editor-text-secondary">
                    {t('email.borderRadiusHint', 'Se aplica a botones y tarjetas por defecto')}
                </p>
            </div>
        </div>
    );
};

export default GlobalStylesControls;






