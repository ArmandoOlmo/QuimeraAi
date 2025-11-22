
import React, { useState } from 'react';
import { EditableComponentID, PaddingSize, FontSize, ImageStyle, BorderRadiusSize, BorderSize, JustifyContent, ImagePosition, AspectRatio, ObjectFit, ResponsiveStyles, AnimationConfig } from '../../../types';
import { useEditor } from '../../../contexts/EditorContext';
import { componentStyles } from '../../../data/componentStyles';
import ColorControl from '../../ui/ColorControl';
import { Type } from 'lucide-react';
import ResponsiveConfigEditor from './ResponsiveConfigEditor';
import AnimationConfigurator from './AnimationConfigurator';

// Simple re-usable controls from Controls.tsx
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

const ToggleControl: React.FC<{ label?: string; checked: boolean; onChange: (checked: boolean) => void; }> = ({ label, checked, onChange }) => (
    <div className={`flex items-center ${label ? 'justify-between' : 'justify-start'}`}>
        {label && <Label>{label}</Label>}
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label || 'Toggle'}
            onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            draggable={false}
            className={`${checked ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-editor-accent focus:ring-offset-2 focus:ring-offset-editor-panel-bg`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const PaddingControl: React.FC<{ label: string; value: PaddingSize; onChange: (value: PaddingSize) => void }> = ({ label, value, onChange }) => {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex bg-editor-bg p-1 rounded-md space-x-1 border border-editor-border">
                {(['sm', 'md', 'lg'] as PaddingSize[]).map(opt => (
                    <button key={opt} onClick={() => onChange(opt)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === opt ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>
                        {opt.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};

const FontSizeControl: React.FC<{ label: string; value: FontSize; onChange: (value: FontSize) => void }> = ({ label, value, onChange }) => {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex bg-editor-bg p-1 rounded-md space-x-1 border border-editor-border">
                {(['sm', 'md', 'lg', 'xl'] as FontSize[]).map(opt => (
                    <button key={opt} onClick={() => onChange(opt)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === opt ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>
                        {opt.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};

const BorderRadiusControl: React.FC<{ label?: string; value: BorderRadiusSize; onChange: (value: BorderRadiusSize) => void }> = ({ label, value, onChange }) => {
    const options: { value: BorderRadiusSize; label: string }[] = [
        { value: 'none', label: 'None' }, { value: 'md', label: 'Med' }, { value: 'xl', label: 'Lg' }, { value: 'full', label: 'Full' },
    ];
    return (
        <div>
            {label && <Label>{label}</Label>}
            <div className="flex bg-editor-bg p-1 rounded-md space-x-1 border border-editor-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>{option.label}</button>
                ))}
            </div>
        </div>
    );
};

const BorderSizeControl: React.FC<{ label: string; value: BorderSize; onChange: (value: BorderSize) => void }> = ({ label, value, onChange }) => {
    const options: { value: BorderSize; label: string }[] = [
        { value: 'none', label: 'None' }, { value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' },
    ];
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex bg-editor-bg p-1 rounded-md space-x-1 border border-editor-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>{option.label}</button>
                ))}
            </div>
        </div>
    );
};

const PositionControl: React.FC<{ value: ImagePosition; onChange: (value: ImagePosition) => void }> = ({ value, onChange }) => {
    const options: { value: ImagePosition; label: string }[] = [
        { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
    ];
    return (
        <div>
            <Label>Image Position</Label>
            <div className="flex bg-editor-bg p-1 rounded-md space-x-1 border border-editor-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>{option.label}</button>
                ))}
            </div>
        </div>
    );
};

const JustifyContentControl: React.FC<{ value: JustifyContent; onChange: (value: JustifyContent) => void }> = ({ value, onChange }) => {
    const options: { value: JustifyContent; label: string }[] = [
        { value: 'start', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'end', label: 'Right' },
    ];
    return (
        <div>
            <Label>Image Align</Label>
            <div className="flex bg-editor-bg p-1 rounded-md space-x-1 border border-editor-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>{option.label}</button>
                ))}
            </div>
        </div>
    );
};

const AspectRatioControl: React.FC<{ value: AspectRatio; onChange: (value: AspectRatio) => void }> = ({ value, onChange }) => {
    const options: { value: AspectRatio; label: string }[] = [
        { value: 'auto', label: 'Auto' }, { value: '1:1', label: '1:1' }, { value: '4:3', label: '4:3' },
        { value: '3:4', label: '3:4' }, { value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' },
    ];
    return (
        <div>
            <Label>Aspect Ratio</Label>
            <div className="grid grid-cols-3 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>{option.label}</button>
                ))}
            </div>
        </div>
    );
};

const ObjectFitControl: React.FC<{ value: ObjectFit; onChange: (value: ObjectFit) => void }> = ({ value, onChange }) => {
    const options: { value: ObjectFit; label: string }[] = [
        { value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'fill', label: 'Fill' },
    ];
    return (
        <div>
            <Label>Image Fit</Label>
            <div className="flex bg-editor-bg p-1 rounded-md space-x-1 border border-editor-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>{option.label}</button>
                ))}
            </div>
        </div>
    );
};

const ImageStyleControl: React.FC<{ value: ImageStyle; onChange: (value: ImageStyle) => void }> = ({ value, onChange }) => {
    const options: { value: ImageStyle; label: string }[] = [
        { value: 'default', label: 'Default' }, { value: 'rounded-full', label: 'Circle' }, { value: 'glow', label: 'Glow' },
        { value: 'float', label: 'Float' }, { value: 'hexagon', label: 'Hexagon' }, { value: 'polaroid', label: 'Polaroid' },
    ];
    return (
        <div>
            <Label>Image Style</Label>
            <div className="grid grid-cols-3 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
                {options.map(opt => <button key={opt.value} onClick={() => onChange(opt.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === opt.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>{opt.label}</button>)}
            </div>
        </div>
    );
};


interface ComponentControlsProps {
    selectedComponentId: string;
}

const ComponentControls: React.FC<ComponentControlsProps> = ({ selectedComponentId }) => {
    const { componentStyles: contextStyles, customComponents, updateComponentStyle, activeProject, saveProject } = useEditor();
    const [activeTab, setActiveTab] = useState<'styles' | 'responsive' | 'animation'>('styles');

    const isCustom = !Object.keys(contextStyles).includes(selectedComponentId);
    
    const componentData = isCustom
        ? customComponents.find(c => c.id === selectedComponentId)
        : { baseComponent: selectedComponentId as EditableComponentID, styles: contextStyles[selectedComponentId as EditableComponentID] };

    if (!componentData) return <div className="p-4 text-editor-text-secondary">Loading controls...</div>;

    const { baseComponent, styles } = componentData;

    const handleStyleChange = (key: string, value: any) => {
        updateComponentStyle(selectedComponentId, { [key]: value }, isCustom);
    };

    const handleColorChange = (colorName: string, value: string) => {
        const newColors = { ...styles?.colors, [colorName]: value };
        updateComponentStyle(selectedComponentId, { colors: newColors }, isCustom);
    };

    const handleResponsiveStylesUpdate = async (responsiveStyles: ResponsiveStyles) => {
        if (!activeProject) return;
        
        const updatedProject = {
            ...activeProject,
            responsiveStyles: {
                ...(activeProject.responsiveStyles || {}),
                [selectedComponentId]: responsiveStyles
            }
        };
        
        // Update local state through saveProject
        await saveProject();
    };

    if (!styles) return null;

    const currentResponsiveStyles = activeProject?.responsiveStyles?.[selectedComponentId] || {};
    const currentAnimation = (styles as any)?.animation as AnimationConfig | undefined;

    const handleAnimationUpdate = async (animationConfig: AnimationConfig) => {
        await updateComponentStyle(selectedComponentId, { animation: animationConfig }, isCustom);
    };

    const renderHeroControls = () => {
        const heroStyles = styles as typeof componentStyles['hero'];
        const colors = (heroStyles.colors || {}) as any;
        
        return (
            <div className="space-y-4">
                <h4 className="font-semibold text-editor-text-primary">Layout & Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={heroStyles.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={heroStyles.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Body Text" value={colors.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading Color" value={colors.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    {/* Placeholder */}
                </div>

                <hr className="border-editor-border/50" />
                
                <h4 className="font-semibold text-editor-text-primary">Buttons</h4>
                
                <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-2">Primary Button</h5>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors.buttonBackground || '#4f46e5'} onChange={v => handleColorChange('buttonBackground', v)} />
                    <ColorControl label="Text" value={colors.buttonText || '#ffffff'} onChange={v => handleColorChange('buttonText', v)} />
                </div>

                <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mt-2">Secondary Button</h5>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors.secondaryButtonBackground || '#334155'} onChange={v => handleColorChange('secondaryButtonBackground', v)} />
                    <ColorControl label="Text" value={colors.secondaryButtonText || '#ffffff'} onChange={v => handleColorChange('secondaryButtonText', v)} />
                </div>
                
                <hr className="border-editor-border/50" />
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-editor-accent" />
                    <h4 className="font-semibold text-editor-text-primary">Typography</h4>
                </div>
                <FontSizeControl label="Headline Size" value={heroStyles.headlineFontSize || 'lg'} onChange={v => handleStyleChange('headlineFontSize', v)} />
                <FontSizeControl label="Subheadline Size" value={heroStyles.subheadlineFontSize || 'lg'} onChange={v => handleStyleChange('subheadlineFontSize', v)} />

                <hr className="border-editor-border/50" />
                <h4 className="font-semibold text-editor-text-primary">Image Styling</h4>
                <ImageStyleControl value={heroStyles.imageStyle || 'default'} onChange={v => handleStyleChange('imageStyle', v)} />
                <ToggleControl label="Drop Shadow" checked={heroStyles.imageDropShadow || false} onChange={v => handleStyleChange('imageDropShadow', v)} />
                <div className="grid grid-cols-2 gap-4">
                    <PositionControl value={heroStyles.imagePosition || 'right'} onChange={v => handleStyleChange('imagePosition', v)} />
                    <JustifyContentControl value={heroStyles.imageJustification || 'center'} onChange={v => handleStyleChange('imageJustification', v)} />
                </div>
                <div>
                    <BorderRadiusControl label="Corner Radius (for 'Default' style)" value={heroStyles.imageBorderRadius || 'md'} onChange={v => handleStyleChange('imageBorderRadius', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <BorderSizeControl label="Border Size" value={heroStyles.imageBorderSize || 'none'} onChange={v => handleStyleChange('imageBorderSize', v)} />
                    <ColorControl label="Border Color" value={heroStyles.imageBorderColor || 'transparent'} onChange={v => handleStyleChange('imageBorderColor', v)} />
                </div>

                <hr className="border-editor-border/50" />
                <h4 className="font-semibold text-editor-text-primary">Image Sizing</h4>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center">
                            <Label>Image Width</Label>
                            <span className="text-sm font-medium text-editor-text-primary">{heroStyles.imageWidth || 100}%</span>
                        </div>
                        <input
                            type="range" min="25" max="100" step="1"
                            value={heroStyles.imageWidth || 100}
                            onChange={e => handleStyleChange('imageWidth', parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <ToggleControl
                        label="Set Max Height"
                        checked={heroStyles.imageHeightEnabled || false}
                        onChange={v => handleStyleChange('imageHeightEnabled', v)}
                    />
                    {heroStyles.imageHeightEnabled && (
                        <div>
                            <div className="flex justify-between items-center">
                                <Label>Max Height</Label>
                                <span className="text-sm font-medium text-editor-text-primary">{heroStyles.imageHeight || 500}px</span>
                            </div>
                            <input
                                type="range"
                                min="200"
                                max="800"
                                step="10"
                                value={heroStyles.imageHeight || 500}
                                onChange={e => handleStyleChange('imageHeight', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    )}

                    <AspectRatioControl value={heroStyles.imageAspectRatio || 'auto'} onChange={v => handleStyleChange('imageAspectRatio', v)} />
                    <ObjectFitControl value={heroStyles.imageObjectFit || 'cover'} onChange={v => handleStyleChange('imageObjectFit', v)} />
                </div>
            </div>
        )
    };

    const renderFeaturesControls = () => {
        const s = styles as typeof componentStyles['features'];
        return (
            <div className="space-y-4">
                 <h4 className="font-semibold text-editor-text-primary">Grid Layout</h4>
                <div>
                    <Label>Columns (Desktop)</Label>
                     <div className="flex bg-editor-bg p-1 rounded-md space-x-1 border border-editor-border">
                        {[2, 3, 4].map(cols => (
                            <button key={cols} onClick={() => handleStyleChange('gridColumns', cols)} className={`flex-1 text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${s.gridColumns === cols ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}>
                                {cols}
                            </button>
                        ))}
                    </div>
                </div>
                
                <h4 className="font-semibold text-editor-text-primary mt-4">Card Image</h4>
                <div className="space-y-4">
                     <div>
                        <div className="flex justify-between items-center">
                            <Label>Image Height</Label>
                            <span className="text-sm font-medium text-editor-text-primary">{s.imageHeight || 200}px</span>
                        </div>
                        <input
                            type="range" min="100" max="600" step="10"
                            value={s.imageHeight || 200}
                            onChange={e => handleStyleChange('imageHeight', parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <ObjectFitControl value={s.imageObjectFit || 'cover'} onChange={v => handleStyleChange('imageObjectFit', v)} />
                </div>
                
                <hr className="border-editor-border/50" />

                <h4 className="font-semibold text-editor-text-primary">Layout & Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    {<PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />}
                    {<PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Background" value={s.colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />}
                    {<ColorControl label="Body Text" value={s.colors?.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Heading Color" value={s.colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />}
                    {<ColorControl label="Accent" value={s.colors?.accent || 'transparent'} onChange={v => handleColorChange('accent', v)} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Border Color" value={s.colors?.borderColor || 'transparent'} onChange={v => handleColorChange('borderColor', v)} />}
                </div>

                <hr className="border-editor-border/50" />
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-editor-accent" />
                    <h4 className="font-semibold text-editor-text-primary">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />
            </div>
        );
    };
    
    const renderStandardControls = () => {
        const s = styles as any;
        return (
            <div className="space-y-4">
                <h4 className="font-semibold text-editor-text-primary">Layout & Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    {<PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />}
                    {<PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Background" value={s.colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />}
                    {<ColorControl label="Body Text" value={s.colors?.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Heading Color" value={s.colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />}
                    {<ColorControl label="Accent" value={s.colors?.accent || 'transparent'} onChange={v => handleColorChange('accent', v)} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Border Color" value={s.colors?.borderColor || 'transparent'} onChange={v => handleColorChange('borderColor', v)} />}
                </div>

                <hr className="border-editor-border/50" />
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-editor-accent" />
                    <h4 className="font-semibold text-editor-text-primary">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />
            </div>
        );
    };

    const renderCtaControls = () => {
        const ctaStyles = styles as typeof componentStyles['cta'];
        const colors = (ctaStyles.colors || {}) as any;
        return (
            <div className="space-y-4">
                <h4 className="font-semibold text-editor-text-primary">Layout & Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={ctaStyles.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={ctaStyles.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Body Text" value={colors.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                    <ColorControl label="Heading Color" value={colors.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Gradient Start" value={colors.gradientStart || '#0000ff'} onChange={v => handleColorChange('gradientStart', v)} />
                    <ColorControl label="Gradient End" value={colors.gradientEnd || '#00ff00'} onChange={v => handleColorChange('gradientEnd', v)} />
                </div>

                <hr className="border-editor-border/50" />
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-editor-accent" />
                    <h4 className="font-semibold text-editor-text-primary">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={ctaStyles.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={ctaStyles.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />
            </div>
        );
    };

    const renderFooterControls = () => {
        const s = styles as typeof componentStyles['footer'];
        const colors = (s.colors || {}) as any;
        return (
            <div className="space-y-4">
                <h4 className="font-semibold text-editor-text-primary">Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Body Text" value={colors.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading Color" value={colors.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Link Hover" value={colors.linkHover || '#aaaaaa'} onChange={v => handleColorChange('linkHover', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Border" value={colors.border || 'transparent'} onChange={v => handleColorChange('border', v)} />
                </div>

                <hr className="border-editor-border/50" />
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-editor-accent" />
                    <h4 className="font-semibold text-editor-text-primary">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'sm'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'sm'} onChange={v => handleStyleChange('descriptionFontSize', v)} />
            </div>
        );
    };

    const renderHeaderControls = () => {
        const s = styles as any;
        const colors = (s.colors || {}) as any;
        
        return (
            <div className="space-y-4">
                <h4 className="font-semibold text-editor-text-primary">Layout & Style</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Layout</Label>
                        <select 
                            value={s.layout || 'classic'} 
                            onChange={(e) => handleStyleChange('layout', e.target.value)}
                            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary"
                        >
                            <option value="classic">Classic (Left)</option>
                            <option value="minimal">Minimal</option>
                            <option value="center">Center</option>
                            <option value="stack">Stack</option>
                        </select>
                    </div>
                    <div>
                        <Label>Style</Label>
                        <select 
                            value={s.style || 'sticky-solid'} 
                            onChange={(e) => handleStyleChange('style', e.target.value)}
                            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary"
                        >
                            <option value="sticky-solid">Solid</option>
                            <option value="sticky-transparent">Transparent</option>
                            <option value="floating">Floating</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ToggleControl label="Sticky" checked={s.isSticky !== false} onChange={(v) => handleStyleChange('isSticky', v)} />
                    <ToggleControl label="Glass Effect" checked={s.glassEffect || false} onChange={(v) => handleStyleChange('glassEffect', v)} />
                </div>

                <div>
                    <div className="flex justify-between items-center">
                        <Label>Height</Label>
                        <span className="text-sm font-medium text-editor-text-primary">{s.height || 70}px</span>
                    </div>
                    <input
                        type="range" min="50" max="120" step="5"
                        value={s.height || 70}
                        onChange={e => handleStyleChange('height', parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <hr className="border-editor-border/50" />

                <h4 className="font-semibold text-editor-text-primary">Logo</h4>
                <div>
                    <Label>Logo Type</Label>
                    <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                        {['text', 'image', 'both'].map(type => (
                            <button 
                                key={type}
                                onClick={() => handleStyleChange('logoType', type)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors capitalize ${
                                    (s.logoType || 'text') === type 
                                        ? 'bg-editor-accent text-editor-bg' 
                                        : 'text-editor-text-secondary hover:bg-editor-border'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {((s.logoType || 'text') === 'image' || (s.logoType || 'text') === 'both') && (
                    <div className="space-y-3 p-3 bg-editor-border/20 rounded-md">
                        <div>
                            <Label>Logo Image URL</Label>
                            <input
                                type="text"
                                value={s.logoImageUrl || ''}
                                onChange={(e) => handleStyleChange('logoImageUrl', e.target.value)}
                                placeholder="https://example.com/logo.png"
                                className="w-full bg-editor-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary"
                            />
                            <p className="text-xs text-editor-text-secondary mt-1">
                                💡 Tip: Upload through Assets Manager or paste URL
                            </p>
                        </div>
                        
                        {s.logoImageUrl && (
                            <div className="border border-editor-border rounded-md p-2 bg-editor-bg">
                                <img 
                                    src={s.logoImageUrl} 
                                    alt="Logo preview" 
                                    className="max-h-16 mx-auto"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E❌%3C/text%3E%3C/svg%3E';
                                    }}
                                />
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-center">
                                <Label>Logo Width</Label>
                                <span className="text-sm font-medium text-editor-text-primary">{s.logoWidth || 120}px</span>
                            </div>
                            <input
                                type="range" min="40" max="300" step="5"
                                value={s.logoWidth || 120}
                                onChange={e => handleStyleChange('logoWidth', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {((s.logoType || 'text') === 'text' || (s.logoType || 'text') === 'both') && (
                    <div>
                        <Label>Logo Text</Label>
                        <input
                            type="text"
                            value={s.logoText || 'Brand'}
                            onChange={(e) => handleStyleChange('logoText', e.target.value)}
                            className="w-full bg-editor-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary"
                        />
                    </div>
                )}

                <hr className="border-editor-border/50" />

                <h4 className="font-semibold text-editor-text-primary">Call-to-Action Button</h4>
                <ToggleControl label="Show CTA Button" checked={s.showCta !== false} onChange={(v) => handleStyleChange('showCta', v)} />
                
                {s.showCta !== false && (
                    <div className="space-y-3 p-3 bg-editor-border/20 rounded-md animate-fade-in-up">
                        <div>
                            <Label>Button Text</Label>
                            <input
                                type="text"
                                value={s.ctaText || 'Get Started'}
                                onChange={(e) => handleStyleChange('ctaText', e.target.value)}
                                className="w-full bg-editor-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary"
                            />
                        </div>
                        
                        <BorderRadiusControl 
                            label="Button Radius" 
                            value={s.buttonBorderRadius || 'md'} 
                            onChange={(v) => handleStyleChange('buttonBorderRadius', v)} 
                        />
                    </div>
                )}

                <hr className="border-editor-border/50" />

                <h4 className="font-semibold text-editor-text-primary">Login Button</h4>
                <ToggleControl label="Show Login Button" checked={s.showLogin !== false} onChange={(v) => handleStyleChange('showLogin', v)} />
                
                {s.showLogin !== false && (
                    <div className="space-y-3 p-3 bg-editor-border/20 rounded-md animate-fade-in-up">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Login Text</Label>
                                <input
                                    type="text"
                                    value={s.loginText || 'Login'}
                                    onChange={(e) => handleStyleChange('loginText', e.target.value)}
                                    className="w-full bg-editor-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary"
                                />
                            </div>
                            <div>
                                <Label>Login URL</Label>
                                <input
                                    type="text"
                                    value={s.loginUrl || '#'}
                                    onChange={(e) => handleStyleChange('loginUrl', e.target.value)}
                                    className="w-full bg-editor-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <hr className="border-editor-border/50" />

                <h4 className="font-semibold text-editor-text-primary">Navigation Links</h4>
                <div>
                    <Label>Hover Style</Label>
                    <select 
                        value={s.hoverStyle || 'underline'} 
                        onChange={(e) => handleStyleChange('hoverStyle', e.target.value)}
                        className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-2 py-2 text-sm text-editor-text-primary"
                    >
                        <option value="underline">Underline</option>
                        <option value="bold">Bold</option>
                        <option value="scale">Scale</option>
                        <option value="glow">Glow</option>
                    </select>
                </div>

                <hr className="border-editor-border/50" />

                <h4 className="font-semibold text-editor-text-primary">Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors.background || '#ffffff'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Text" value={colors.text || '#000000'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Accent" value={colors.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                    <ColorControl label="Border" value={colors.border || 'transparent'} onChange={v => handleColorChange('border', v)} />
                </div>
            </div>
        );
    };

    const renderControls = () => {
        switch (baseComponent) {
            case 'hero': return renderHeroControls();
            case 'features': return renderFeaturesControls();
            case 'cta': return renderCtaControls();
            case 'header': return renderHeaderControls();
            // Standard handlers for all other components that share similar structure
            case 'services':
            case 'team':
            case 'testimonials':
            case 'pricing':
            case 'faq':
            case 'portfolio':
            case 'leads':
            case 'newsletter':
            case 'video':
            case 'howItWorks':
            case 'slideshow':
                return renderStandardControls();
            case 'footer':
                 return renderFooterControls();
            default: return <p className="text-editor-text-secondary">No specific styles to edit for this component yet.</p>;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="border-b border-editor-border flex-shrink-0">
                <div className="px-4">
                    <nav className="-mb-px flex space-x-6">
                        <button
                            onClick={() => setActiveTab('styles')}
                            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                                activeTab === 'styles'
                                    ? 'border-editor-accent text-editor-accent'
                                    : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                            }`}
                        >
                            Styles
                        </button>
                        <button
                            onClick={() => setActiveTab('responsive')}
                            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                                activeTab === 'responsive'
                                    ? 'border-editor-accent text-editor-accent'
                                    : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                            }`}
                        >
                            Responsive
                        </button>
                        <button
                            onClick={() => setActiveTab('animation')}
                            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                                activeTab === 'animation'
                                    ? 'border-editor-accent text-editor-accent'
                                    : 'border-transparent text-editor-text-secondary hover:text-editor-text-primary'
                            }`}
                        >
                            Animation
                        </button>
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'styles' && renderControls()}
                {activeTab === 'responsive' && (
                    <ResponsiveConfigEditor
                        componentId={selectedComponentId}
                        currentStyles={currentResponsiveStyles}
                        onUpdate={handleResponsiveStylesUpdate}
                    />
                )}
                {activeTab === 'animation' && (
                    <AnimationConfigurator
                        componentId={selectedComponentId}
                        currentConfig={currentAnimation}
                        onUpdate={handleAnimationUpdate}
                    />
                )}
            </div>
        </div>
    );
};

export default ComponentControls;
