
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../contexts/project';
import { FontFamily } from '../../types';
import ColorControl from './ColorControl';
import { ChevronDown, Image, Italic } from 'lucide-react';
import { fontOptions, formatFontName } from '../../utils/fontLoader';
import FontWeightPicker from './FontWeightPicker';



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
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            
            {/* Font Family Select */}
            <div className="relative mb-2">
                <select
                    value={theme[familyKey] as string}
                    onChange={(e) => handleChange(familyKey, e.target.value as FontFamily)}
                    className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent transition-all appearance-none cursor-pointer hover:border-q-accent/50"
                    style={{ fontFamily: formatFontName(theme[familyKey] as string) }}
                >
                    {fontOptions.map(font => (
                        <option key={font} value={font} className="bg-q-surface text-q-text py-1" style={{ fontFamily: formatFontName(font) }}>
                            {formatFontName(font)}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-q-text-secondary">
                    <ChevronDown className="h-4 w-4" />
                </div>
            </div>
            
            {/* Weight + Italic row */}
            <div className="flex gap-2">
                {/* Weight Select */}
                <FontWeightPicker
                    value={(theme as any)[weightKey] || defaultWeight}
                    onChange={(weight) => handleWeightChange(weightKey, weight)}
                />
                
                {/* Italic Toggle */}
                <button
                    onClick={() => handleStyleToggle(styleKey)}
                    className={`flex items-center justify-center w-8 self-stretch rounded-md border transition-all cursor-pointer ${
                        (theme as any)[styleKey] === 'italic'
                            ? 'bg-q-accent/20 border-q-accent text-q-accent'
                            : 'bg-q-surface border-q-border text-q-text-secondary hover:border-q-accent/50'
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
            <div className="bg-q-surface/50 p-4 rounded-lg border-2 border-q-accent/50 shadow-lg">
                <label className="block text-sm font-bold text-q-accent mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Image size={16} />
                    {t('editor.siteBackground')}
                </label>
                <ColorControl 
                    label="" 
                    value={theme.pageBackground || '#ffffff'} 
                    onChange={handleColorChange}
                />
                <div className="mt-3 p-2 bg-q-bg/50 rounded border border-q-border">
                    <p className="text-xs text-q-text font-medium mb-1">
                        {t('editor.backgroundColorLabel')}
                    </p>
                    <p className="text-xs text-q-text-secondary italic">
                        {t('editor.backgroundColorDescription')}
                    </p>
                </div>
            </div>
            
            <hr className="border-q-border/50 my-4" />
            
            {/* Typography Controls */}
            <div>
                <label className="block text-xs font-bold text-q-text-secondary mb-3 uppercase tracking-wider">
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
