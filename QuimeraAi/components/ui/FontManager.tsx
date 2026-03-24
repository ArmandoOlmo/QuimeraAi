
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../contexts/project';
import { FontFamily } from '../../types';
import ColorControl from './ColorControl';
import { ChevronDown, Image, Italic } from 'lucide-react';
import { fontOptions, formatFontName } from '../../utils/fontLoader';

// Available font weights with human-readable labels
const fontWeightOptions = [
    { value: 100, label: 'Thin (100)' },
    { value: 200, label: 'Extra Light (200)' },
    { value: 300, label: 'Light (300)' },
    { value: 400, label: 'Regular (400)' },
    { value: 500, label: 'Medium (500)' },
    { value: 600, label: 'SemiBold (600)' },
    { value: 700, label: 'Bold (700)' },
    { value: 800, label: 'Extra Bold (800)' },
    { value: 900, label: 'Black (900)' },
];

const FontManager: React.FC = () => {
    const { t } = useTranslation();
    const { theme, setTheme } = useProject();

    const handleChange = (key: keyof typeof theme, value: FontFamily) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    const handleWeightChange = (key: string, value: number) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    const handleStyleToggle = (key: string) => {
        const currentValue = (theme as any)[key] || 'normal';
        setTheme(prev => ({ ...prev, [key]: currentValue === 'normal' ? 'italic' : 'normal' }));
    };

    const handleColorChange = (color: string) => {
        setTheme(prev => ({ ...prev, pageBackground: color }));
    };

    const renderFontGroup = (
        label: string,
        familyKey: keyof typeof theme,
        weightKey: string,
        styleKey: string,
        defaultWeight: number
    ) => (
        <div className="mb-5 last:mb-0">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            
            {/* Font Family Select */}
            <div className="relative mb-2">
                <select
                    value={theme[familyKey] as string}
                    onChange={(e) => handleChange(familyKey, e.target.value as FontFamily)}
                    className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all appearance-none cursor-pointer hover:border-editor-accent/50"
                    style={{ fontFamily: formatFontName(theme[familyKey] as string) }}
                >
                    {fontOptions.map(font => (
                        <option key={font} value={font} className="bg-editor-panel-bg text-editor-text-primary py-1" style={{ fontFamily: formatFontName(font) }}>
                            {formatFontName(font)}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-editor-text-secondary">
                    <ChevronDown className="h-4 w-4" />
                </div>
            </div>
            
            {/* Weight + Italic row */}
            <div className="flex gap-2">
                {/* Weight Select */}
                <div className="relative flex-1">
                    <select
                        value={(theme as any)[weightKey] || defaultWeight}
                        onChange={(e) => handleWeightChange(weightKey, Number(e.target.value))}
                        className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-1.5 text-xs text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all appearance-none cursor-pointer hover:border-editor-accent/50"
                    >
                        {fontWeightOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-editor-text-secondary">
                        <ChevronDown className="h-3 w-3" />
                    </div>
                </div>
                
                {/* Italic Toggle */}
                <button
                    onClick={() => handleStyleToggle(styleKey)}
                    className={`flex items-center justify-center w-8 h-8 rounded-md border transition-all cursor-pointer ${
                        (theme as any)[styleKey] === 'italic'
                            ? 'bg-editor-accent/20 border-editor-accent text-editor-accent'
                            : 'bg-editor-panel-bg border-editor-border text-editor-text-secondary hover:border-editor-accent/50'
                    }`}
                    title={t('editor.italic')}
                >
                    <Italic className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Page Background - Most prominent control */}
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border-2 border-editor-accent/50 shadow-lg">
                <label className="block text-sm font-bold text-editor-accent mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Image size={16} />
                    {t('editor.siteBackground')}
                </label>
                <ColorControl 
                    label="" 
                    value={theme.pageBackground || '#ffffff'} 
                    onChange={handleColorChange}
                />
                <div className="mt-3 p-2 bg-editor-bg/50 rounded border border-editor-border">
                    <p className="text-xs text-editor-text-primary font-medium mb-1">
                        {t('editor.backgroundColorLabel')}
                    </p>
                    <p className="text-xs text-editor-text-secondary italic">
                        {t('editor.backgroundColorDescription')}
                    </p>
                </div>
            </div>
            
            <hr className="border-editor-border/50 my-4" />
            
            {/* Typography Controls */}
            <div>
                <label className="block text-xs font-bold text-editor-text-secondary mb-3 uppercase tracking-wider">
                    {t('editor.fonts')}
                </label>
                {renderFontGroup(t('editor.headingsFont'), 'fontFamilyHeader', 'fontWeightHeader', 'fontStyleHeader', 700)}
                {renderFontGroup(t('editor.bodyFont'), 'fontFamilyBody', 'fontWeightBody', 'fontStyleBody', 400)}
                {renderFontGroup(t('editor.buttonsFont'), 'fontFamilyButton', 'fontWeightButton', 'fontStyleButton', 600)}
            </div>
        </div>
    );
};

export default FontManager;
