
import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { FontFamily } from '../../types';

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

const FontManager: React.FC = () => {
    const { theme, setTheme } = useEditor();

    const handleChange = (key: keyof typeof theme, value: FontFamily) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    const renderSelect = (label: string, key: keyof typeof theme) => (
        <div className="mb-4 last:mb-0">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <select
                    value={theme[key] as string}
                    onChange={(e) => handleChange(key, e.target.value as FontFamily)}
                    className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all appearance-none cursor-pointer hover:border-editor-accent/50"
                >
                    {fontOptions.map(font => (
                        <option key={font} value={font} className="bg-editor-panel-bg text-editor-text-primary py-1">
                            {formatFontName(font)}
                        </option>
                    ))}
                </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-editor-text-secondary">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-2">
            {renderSelect("Headings Font", 'fontFamilyHeader')}
            {renderSelect("Body Text Font", 'fontFamilyBody')}
            {renderSelect("Buttons & UI Font", 'fontFamilyButton')}
        </div>
    );
};

export default FontManager;
