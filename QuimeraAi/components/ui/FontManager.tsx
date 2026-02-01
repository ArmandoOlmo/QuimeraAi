
import React from 'react';
import { useProject } from '../../contexts/project';
import { FontFamily } from '../../types';
import ColorControl from './ColorControl';
import { ChevronDown, Image } from 'lucide-react';

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
    const { theme, setTheme } = useProject();

    const handleChange = (key: keyof typeof theme, value: FontFamily) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    const handleColorChange = (color: string) => {
        setTheme(prev => ({ ...prev, pageBackground: color }));
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
                    <ChevronDown className="h-4 w-4" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Page Background - Most prominent control */}
            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border-2 border-editor-accent/50 shadow-lg">
                <label className="block text-sm font-bold text-editor-accent mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Image size={16} />
                    Fondo General del Sitio Web
                </label>
                <ColorControl 
                    label="" 
                    value={theme.pageBackground || '#ffffff'} 
                    onChange={handleColorChange}
                />
                <div className="mt-3 p-2 bg-editor-bg/50 rounded border border-editor-border">
                    <p className="text-xs text-editor-text-primary font-medium mb-1">
                        ✨ Background Color / Color de Fondo
                    </p>
                    <p className="text-xs text-editor-text-secondary italic">
                        Este color se aplica a TODA la página web (body completo), no solo a secciones individuales.
                    </p>
                </div>
            </div>
            
            <hr className="border-editor-border/50 my-4" />
            
            {/* Typography Controls */}
            <div>
                <label className="block text-xs font-bold text-editor-text-secondary mb-3 uppercase tracking-wider">
                    Fuentes / Fonts
                </label>
                {renderSelect("Headings Font", 'fontFamilyHeader')}
                {renderSelect("Body Text Font", 'fontFamilyBody')}
                {renderSelect("Buttons & UI Font", 'fontFamilyButton')}
            </div>
        </div>
    );
};

export default FontManager;
