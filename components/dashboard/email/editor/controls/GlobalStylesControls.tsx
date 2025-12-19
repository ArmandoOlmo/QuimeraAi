/**
 * GlobalStylesControls
 * Controls for editing global email styles (fonts, colors, etc.)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useEmailEditor } from '../EmailEditor';
import ColorControl from '../../../../ui/ColorControl';

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
                        className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${
                            value === opt.v 
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
    const { document, updateGlobalStyles } = useEmailEditor();
    const { globalStyles } = document;
    
    return (
        <div className="space-y-6">
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
                />
                
                <ColorControl
                    label={t('email.secondaryColor', 'Color secundario')}
                    value={globalStyles.secondaryColor || globalStyles.primaryColor}
                    onChange={(value) => updateGlobalStyles({ secondaryColor: value })}
                />
                
                <ColorControl
                    label={t('email.backgroundColor', 'Fondo del email')}
                    value={globalStyles.backgroundColor}
                    onChange={(value) => updateGlobalStyles({ backgroundColor: value })}
                />
                
                <ColorControl
                    label={t('email.bodyBackgroundColor', 'Fondo exterior')}
                    value={globalStyles.bodyBackgroundColor}
                    onChange={(value) => updateGlobalStyles({ bodyBackgroundColor: value })}
                />
                
                <ColorControl
                    label={t('email.headingColor', 'Color de títulos')}
                    value={globalStyles.headingColor}
                    onChange={(value) => updateGlobalStyles({ headingColor: value })}
                />
                
                <ColorControl
                    label={t('email.textColor', 'Color de texto')}
                    value={globalStyles.textColor}
                    onChange={(value) => updateGlobalStyles({ textColor: value })}
                />
                
                <ColorControl
                    label={t('email.linkColor', 'Color de enlaces')}
                    value={globalStyles.linkColor}
                    onChange={(value) => updateGlobalStyles({ linkColor: value })}
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





