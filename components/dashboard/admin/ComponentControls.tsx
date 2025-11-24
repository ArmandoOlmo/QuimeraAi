
import React, { useState } from 'react';
import { EditableComponentID, PaddingSize, FontSize, ImageStyle, BorderRadiusSize, BorderSize, JustifyContent, ImagePosition, AspectRatio, ObjectFit, ResponsiveStyles, AnimationConfig, ServiceIcon } from '../../../types';
import { useEditor } from '../../../contexts/EditorContext';
import { componentStyles } from '../../../data/componentStyles';
import ColorControl from '../../ui/ColorControl';
import IconSelector from '../../ui/IconSelector';
import { Type, Layout, AlignJustify, Settings, Image, Plus, Trash2 } from 'lucide-react';
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

// IconSelector is now imported from ui/IconSelector.tsx

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
    const [localRefresh, setLocalRefresh] = useState(0);

    const isCustom = !Object.keys(contextStyles).includes(selectedComponentId);
    
    const componentData = isCustom
        ? customComponents.find(c => c.id === selectedComponentId)
        : { baseComponent: selectedComponentId as EditableComponentID, styles: contextStyles[selectedComponentId as EditableComponentID] };

    if (!componentData) return <div className="p-4 text-editor-text-secondary">Loading controls...</div>;

    const { baseComponent, styles } = componentData;

    const handleStyleChange = async (key: string, value: any) => {
        console.log('👉 handleStyleChange called:', key, value);
        await updateComponentStyle(selectedComponentId, { [key]: value }, isCustom);
        setLocalRefresh(prev => prev + 1); // Force re-render
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
        const currentVariant = heroStyles.heroVariant || 'classic';
        
        return (
            <div className="space-y-4">
                {/* ========== HERO VARIANT ========== */}
                <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                    <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                        <Layout size={14} />
                        Hero Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleStyleChange('heroVariant', 'classic')}
                            className={`px-4 py-3 rounded-md border transition-all ${
                                currentVariant === 'classic'
                                    ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-lg' 
                                    : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                            }`}
                        >
                            <div className="font-semibold">Classic</div>
                            <div className="text-xs opacity-70">Two Column</div>
                        </button>
                        <button
                            onClick={() => handleStyleChange('heroVariant', 'modern')}
                            className={`px-4 py-3 rounded-md border transition-all ${
                                currentVariant === 'modern'
                                    ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-lg' 
                                    : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                            }`}
                        >
                            <div className="font-semibold">Modern</div>
                            <div className="text-xs opacity-70">Full Screen</div>
                        </button>
                    </div>
                    <p className="text-xs text-editor-text-secondary mt-2">
                        {currentVariant === 'modern' 
                            ? '✨ Full-screen hero with image background covering entire area' 
                            : '📐 Traditional two-column layout with side-by-side content'}
                    </p>
                </div>
                
                <hr className="border-editor-border/50" />
                
                {/* ========== TYPOGRAPHY ========== */}
                <div>
                    <h4 className="font-semibold text-editor-text-primary mb-3 flex items-center gap-2">
                        <Type size={14} />
                        Typography
                    </h4>
                    <FontSizeControl label="Headline Size" value={heroStyles.headlineFontSize || 'lg'} onChange={v => handleStyleChange('headlineFontSize', v)} />
                    <FontSizeControl label="Subheadline Size" value={heroStyles.subheadlineFontSize || 'lg'} onChange={v => handleStyleChange('subheadlineFontSize', v)} />
                </div>

                <hr className="border-editor-border/50" />

                {/* ========== LAYOUT & SPACING (Only for Classic) ========== */}
                {currentVariant === 'classic' && (
                    <>
                        <div>
                            <h4 className="font-semibold text-editor-text-primary mb-3 flex items-center gap-2">
                                <AlignJustify size={14} />
                                Layout & Spacing
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <PaddingControl label="Vertical Padding" value={heroStyles.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                                <PaddingControl label="Horizontal Padding" value={heroStyles.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                            </div>
                        </div>
                        
                        <hr className="border-editor-border/50" />
                    </>
                )}
                
                {/* ========== COLORS ========== */}
                <div>
                    <h4 className="font-semibold text-editor-text-primary mb-3 flex items-center gap-2">
                        <Settings size={14} />
                        Colors
                    </h4>
                    
                    <div className="space-y-3 bg-editor-bg/50 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                            <ColorControl label="Background" value={colors.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                            <ColorControl label="Body Text" value={colors.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                        </div>
                        
                        <ColorControl label="Heading" value={colors.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />

                        <div className="pt-2">
                            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Primary Button</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl label="Background" value={colors.buttonBackground || '#4f46e5'} onChange={v => handleColorChange('buttonBackground', v)} />
                                <ColorControl label="Text" value={colors.buttonText || '#ffffff'} onChange={v => handleColorChange('buttonText', v)} />
                            </div>
                        </div>

                        <div className="pt-2">
                            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Secondary Button</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl label="Background" value={colors.secondaryButtonBackground || '#334155'} onChange={v => handleColorChange('secondaryButtonBackground', v)} />
                                <ColorControl label="Text" value={colors.secondaryButtonText || '#ffffff'} onChange={v => handleColorChange('secondaryButtonText', v)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========== IMAGE STYLING (Only for Classic) ========== */}
                {currentVariant === 'classic' && (
                    <>
                        <hr className="border-editor-border/50" />
                        <div>
                            <h4 className="font-semibold text-editor-text-primary mb-3 flex items-center gap-2">
                                <Image size={14} />
                                Image Styling
                            </h4>
                            <ImageStyleControl value={heroStyles.imageStyle || 'default'} onChange={v => handleStyleChange('imageStyle', v)} />
                            <ToggleControl label="Drop Shadow" checked={heroStyles.imageDropShadow || false} onChange={v => handleStyleChange('imageDropShadow', v)} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <PositionControl value={heroStyles.imagePosition || 'right'} onChange={v => handleStyleChange('imagePosition', v)} />
                                <JustifyContentControl value={heroStyles.imageJustification || 'center'} onChange={v => handleStyleChange('imageJustification', v)} />
                            </div>
                            
                            <BorderRadiusControl label="Corner Radius" value={heroStyles.imageBorderRadius || 'md'} onChange={v => handleStyleChange('imageBorderRadius', v)} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <BorderSizeControl label="Border Size" value={heroStyles.imageBorderSize || 'none'} onChange={v => handleStyleChange('imageBorderSize', v)} />
                                <ColorControl label="Border Color" value={heroStyles.imageBorderColor || 'transparent'} onChange={v => handleStyleChange('imageBorderColor', v)} />
                            </div>
                        </div>

                        <hr className="border-editor-border/50" />
                        
                        {/* ========== IMAGE SIZING ========== */}
                        <div>
                            <h4 className="font-semibold text-editor-text-primary mb-3">Image Sizing</h4>
                            <div className="space-y-4 bg-editor-bg/50 p-3 rounded-lg">
                                <div>
                                    <div className="flex justify-between items-center">
                                        <Label>Image Width</Label>
                                        <span className="text-sm font-medium text-editor-text-primary">{heroStyles.imageWidth || 100}%</span>
                                    </div>
                                    <input
                                        type="range" min="25" max="100" step="1"
                                        value={heroStyles.imageWidth || 100}
                                        onChange={e => handleStyleChange('imageWidth', parseInt(e.target.value, 10))}
                                        className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                                    />
                                </div>

                                <ToggleControl
                                    label="Set Max Height"
                                    checked={heroStyles.imageHeightEnabled || false}
                                    onChange={v => handleStyleChange('imageHeightEnabled', v)}
                                />
                                {heroStyles.imageHeightEnabled && (
                                    <div className="animate-fade-in-up">
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
                                            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                                        />
                                    </div>
                                )}

                                <AspectRatioControl value={heroStyles.imageAspectRatio || 'auto'} onChange={v => handleStyleChange('imageAspectRatio', v)} />
                                <ObjectFitControl value={heroStyles.imageObjectFit || 'cover'} onChange={v => handleStyleChange('imageObjectFit', v)} />
                            </div>
                        </div>
                    </>
                )}

                {/* Info for Modern variant */}
                {currentVariant === 'modern' && (
                    <div className="bg-editor-bg/50 p-4 rounded-lg border border-dashed border-editor-border">
                        <p className="text-xs text-editor-text-secondary text-center">
                            💡 <strong>Modern variant</strong> uses the hero image as a full-screen background. Users set the image via content editor.
                        </p>
                    </div>
                )}
            </div>
        )
    };

    const renderFeaturesControls = () => {
        const s = styles as typeof componentStyles['features'];
        
        // Asegurarse de que featuresVariant tenga un valor
        const currentVariant = (s as any).featuresVariant || 'classic';

        return (
            <div className="space-y-4">
                 {/* --- NUEVO CONTROL DE VARIANTE --- */}
                 <div>
                     <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2">
                         Features Style
                     </label>
                     <div className="grid grid-cols-2 gap-2 mb-2">
                         <button
                             onClick={() => handleStyleChange('featuresVariant', 'classic')}
                             className={`px-4 py-2 rounded-md border transition-all ${
                                 currentVariant === 'classic'
                                     ? 'bg-editor-accent text-editor-bg border-editor-accent' 
                                     : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                             }`}
                         >
                             Classic
                         </button>
                         <button
                             onClick={() => handleStyleChange('featuresVariant', 'modern')}
                             className={`px-4 py-2 rounded-md border transition-all ${
                                 currentVariant === 'modern'
                                     ? 'bg-editor-accent text-editor-bg border-editor-accent' 
                                     : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                             }`}
                         >
                             Bento / Modern
                         </button>
                     </div>
                     <p className="text-xs text-editor-text-secondary mt-1">
                         {currentVariant === 'modern' 
                             ? '✨ Modern asymmetrical bento grid layout' 
                             : 'box Traditional uniform grid layout'}
                     </p>
                 </div>
                 <hr className="border-editor-border/50" />

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
    
    const renderTestimonialsControls = () => {
        const s = styles as any;
        const currentVariant = s.testimonialsVariant || 'classic';
        
        return (
            <div className="space-y-4">
                <h4 className="font-semibold text-editor-text-primary">Testimonials Style</h4>
                <div>
                    <Label>Variant</Label>
                    <div className="grid grid-cols-2 gap-2 bg-editor-bg p-1 rounded-md border border-editor-border">
                        <button 
                            onClick={() => handleStyleChange('testimonialsVariant', 'classic')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${
                                currentVariant === 'classic' 
                                    ? 'bg-editor-accent text-editor-bg' 
                                    : 'text-editor-text-secondary hover:bg-editor-border'
                            }`}
                        >
                            📋 Classic
                        </button>
                        <button 
                            onClick={() => handleStyleChange('testimonialsVariant', 'minimal-cards')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${
                                currentVariant === 'minimal-cards' 
                                    ? 'bg-editor-accent text-editor-bg' 
                                    : 'text-editor-text-secondary hover:bg-editor-border'
                            }`}
                        >
                            ✨ Minimal
                        </button>
                        <button 
                            onClick={() => handleStyleChange('testimonialsVariant', 'glassmorphism')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${
                                currentVariant === 'glassmorphism' 
                                    ? 'bg-editor-accent text-editor-bg' 
                                    : 'text-editor-text-secondary hover:bg-editor-border'
                            }`}
                        >
                            💎 Glass
                        </button>
                        <button 
                            onClick={() => handleStyleChange('testimonialsVariant', 'gradient-glow')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${
                                currentVariant === 'gradient-glow' 
                                    ? 'bg-editor-accent text-editor-bg' 
                                    : 'text-editor-text-secondary hover:bg-editor-border'
                            }`}
                        >
                            🌟 Glow
                        </button>
                        <button 
                            onClick={() => handleStyleChange('testimonialsVariant', 'neon-border')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${
                                currentVariant === 'neon-border' 
                                    ? 'bg-editor-accent text-editor-bg' 
                                    : 'text-editor-text-secondary hover:bg-editor-border'
                            }`}
                        >
                            ⚡ Neon
                        </button>
                        <button 
                            onClick={() => handleStyleChange('testimonialsVariant', 'floating-cards')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${
                                currentVariant === 'floating-cards' 
                                    ? 'bg-editor-accent text-editor-bg' 
                                    : 'text-editor-text-secondary hover:bg-editor-border'
                            }`}
                        >
                            🎈 Float
                        </button>
                        <button 
                            onClick={() => handleStyleChange('testimonialsVariant', 'gradient-shift')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${
                                currentVariant === 'gradient-shift' 
                                    ? 'bg-editor-accent text-editor-bg' 
                                    : 'text-editor-text-secondary hover:bg-editor-border'
                            }`}
                        >
                            🌈 Shift
                        </button>
                    </div>
                    <p className="text-xs text-editor-text-secondary mt-1">
                        {currentVariant === 'classic' && '📋 Traditional cards with borders and shadows'}
                        {currentVariant === 'minimal-cards' && '✨ Clean minimal design with subtle borders'}
                        {currentVariant === 'glassmorphism' && '💎 Modern glass effect with blur'}
                        {currentVariant === 'gradient-glow' && '🌟 Gradient backgrounds with glow effects'}
                        {currentVariant === 'neon-border' && '⚡ Animated neon border with pulsing effect'}
                        {currentVariant === 'floating-cards' && '🎈 3D floating cards with depth and rotation'}
                        {currentVariant === 'gradient-shift' && '🌈 Animated shifting gradient backgrounds'}
                    </p>
                </div>

                <hr className="border-editor-border/50" />

                <h4 className="font-semibold text-editor-text-primary">Card Styling</h4>
                <div className="space-y-4">
                    <BorderRadiusControl 
                        label="Border Radius" 
                        value={s.borderRadius || 'xl'} 
                        onChange={(v) => handleStyleChange('borderRadius', v)} 
                    />

                    {currentVariant === 'classic' && (
                        <div className="space-y-4 p-3 bg-editor-border/20 rounded-md animate-fade-in-up">
                            <div>
                                <Label>Border Style</Label>
                                <div className="grid grid-cols-2 gap-2 bg-editor-bg p-1 rounded-md border border-editor-border">
                                    {['none', 'solid', 'gradient', 'glow'].map(style => (
                                        <button 
                                            key={style}
                                            onClick={() => handleStyleChange('borderStyle', style)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors capitalize ${
                                                (s.borderStyle || 'solid') === style 
                                                    ? 'bg-editor-accent text-editor-bg' 
                                                    : 'text-editor-text-secondary hover:bg-editor-border'
                                            }`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label>Card Shadow</Label>
                                <div className="grid grid-cols-3 gap-2 bg-editor-bg p-1 rounded-md border border-editor-border">
                                    {['none', 'sm', 'md', 'lg', 'xl'].map(shadow => (
                                        <button 
                                            key={shadow}
                                            onClick={() => handleStyleChange('cardShadow', shadow)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors uppercase ${
                                                (s.cardShadow || 'lg') === shadow 
                                                    ? 'bg-editor-accent text-editor-bg' 
                                                    : 'text-editor-text-secondary hover:bg-editor-border'
                                            }`}
                                        >
                                            {shadow}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-center">
                            <Label>Card Padding</Label>
                            <span className="text-sm font-medium text-editor-text-primary">{s.cardPadding || 32}px</span>
                        </div>
                        <input
                            type="range" min="16" max="64" step="4"
                            value={s.cardPadding || 32}
                            onChange={e => handleStyleChange('cardPadding', parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <hr className="border-editor-border/50" />

                <h4 className="font-semibold text-editor-text-primary">Avatar Styling</h4>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center">
                            <Label>Border Width</Label>
                            <span className="text-sm font-medium text-editor-text-primary">{s.avatarBorderWidth || 2}px</span>
                        </div>
                        <input
                            type="range" min="0" max="8" step="1"
                            value={s.avatarBorderWidth || 2}
                            onChange={e => handleStyleChange('avatarBorderWidth', parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <ColorControl 
                        label="Border Color" 
                        value={s.avatarBorderColor || s.colors?.accent || '#4f46e5'} 
                        onChange={v => handleStyleChange('avatarBorderColor', v)} 
                    />
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
                    {<ColorControl label="Card Background" value={s.colors?.cardBackground || '#1f2937'} onChange={v => handleColorChange('cardBackground', v)} />}
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

    const renderMenuControls = () => {
        const s = styles as typeof componentStyles['menu'];
        const colors = (s.colors || {}) as any;
        const currentVariant = s.menuVariant || 'classic';

        return (
            <div className="space-y-4">
                 {/* --- VARIANT SELECTOR --- */}
                 <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                     <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                         <Layout size={14} />
                         Menu Style
                     </label>
                     <div className="grid grid-cols-3 gap-2">
                         {['classic', 'modern-grid', 'elegant-list'].map((variant) => (
                             <button
                                 key={variant}
                                 onClick={() => handleStyleChange('menuVariant', variant)}
                                 className={`px-2 py-2 rounded-md border text-xs transition-all ${
                                     currentVariant === variant
                                         ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold' 
                                         : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                                 }`}
                             >
                                 {variant === 'classic' && '🍽️ Classic'}
                                 {variant === 'modern-grid' && '✨ Modern'}
                                 {variant === 'elegant-list' && '📋 Elegant'}
                             </button>
                         ))}
                     </div>
                     <p className="text-xs text-editor-text-secondary mt-2 italic">
                        {currentVariant === 'classic' && '🍽️ Traditional grid cards with images on top.'}
                        {currentVariant === 'modern-grid' && '✨ Bento-style grid with dynamic layouts.'}
                        {currentVariant === 'elegant-list' && '📋 Magazine-style horizontal list layout.'}
                     </p>
                 </div>

                <hr className="border-editor-border/50" />

                {/* --- ICON CONTROLS --- */}
                <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                    <h4 className="font-semibold text-editor-text-primary mb-3 flex items-center gap-2">
                        <Settings size={14} />
                        Icon Settings
                    </h4>
                    <div className="space-y-3">
                        <ToggleControl 
                            label="Show Icon" 
                            checked={s.showIcon !== false} 
                            onChange={(v) => handleStyleChange('showIcon', v)} 
                        />
                        {s.showIcon !== false && (
                            <div className="animate-fade-in-up">
                                <IconSelector 
                                    label="Menu Icon"
                                    value={(s as any).icon || 'utensils-crossed'} 
                                    onChange={(v) => handleStyleChange('icon', v)} 
                                />
                            </div>
                        )}
                    </div>
                </div>

                <hr className="border-editor-border/50" />

                {/* --- STANDARD CONTROLS --- */}
                <h4 className="font-semibold text-editor-text-primary">Layout & Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Text" value={colors.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading" value={colors.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Accent" value={colors.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Border Color" value={colors.borderColor || '#334155'} onChange={v => handleColorChange('borderColor', v)} />
                    <ColorControl label="Price Color" value={colors.priceColor || '#10b981'} onChange={v => handleColorChange('priceColor', v)} />
                </div>
                <div>
                    <ColorControl label="Card Background" value={colors.cardBackground || '#1e293b'} onChange={v => handleColorChange('cardBackground', v)} />
                </div>

                <hr className="border-editor-border/50" />

                <h4 className="font-semibold text-editor-text-primary">Typography</h4>
                <div className="grid grid-cols-2 gap-4">
                    <FontSizeControl label="Title Font Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                    <FontSizeControl label="Description Font Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />
                </div>
            </div>
        );
    };

    const renderServicesControls = () => {
        const s = styles as typeof componentStyles['services'];
        const colors = (s.colors || {}) as any;
        const currentVariant = s.servicesVariant || 'cards';

        return (
            <div className="space-y-4">
                 {/* --- VARIANT SELECTOR --- */}
                 <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                     <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                         <Layout size={14} />
                         Services Style
                     </label>
                     <div className="grid grid-cols-3 gap-2">
                         {['cards', 'grid', 'minimal'].map((variant) => (
                             <button
                                 key={variant}
                                 onClick={() => handleStyleChange('servicesVariant', variant)}
                                 className={`px-2 py-2 rounded-md border text-xs transition-all capitalize ${
                                     currentVariant === variant
                                         ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold' 
                                         : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                                 }`}
                             >
                                 {variant}
                             </button>
                         ))}
                     </div>
                     <p className="text-xs text-editor-text-secondary mt-2 italic">
                        {currentVariant === 'cards' && 'Standard centered cards with hover effects.'}
                        {currentVariant === 'grid' && 'Modern bento-style grid with left alignment.'}
                        {currentVariant === 'minimal' && 'Clean list layout for a professional look.'}
                     </p>
                 </div>

                <hr className="border-editor-border/50" />

                {/* --- STANDARD CONTROLS --- */}
                <h4 className="font-semibold text-editor-text-primary">Layout & Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Text" value={colors.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading" value={colors.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Accent" value={colors.accent || 'transparent'} onChange={v => handleColorChange('accent', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Border" value={colors.borderColor || 'transparent'} onChange={v => handleColorChange('borderColor', v)} />
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

    // Note: renderStandardControls() handles service items editing including icons
    // This is in the parent Controls.tsx component that manages the full page data

    const renderTeamControls = () => {
        const s = styles as typeof componentStyles['team'];
        const colors = (s.colors || {}) as any;
        const currentVariant = (s as any).teamVariant || 'classic';

        return (
            <div className="space-y-4">
                 {/* --- VARIANT SELECTOR --- */}
                 <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                     <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                         <Layout size={14} />
                         Team Style
                     </label>
                     <div className="grid grid-cols-2 gap-2">
                         {['classic', 'cards', 'minimal', 'overlay'].map((variant) => (
                             <button
                                 key={variant}
                                 onClick={() => handleStyleChange('teamVariant', variant)}
                                 className={`px-3 py-2 rounded-md border text-xs transition-all capitalize ${
                                     currentVariant === variant
                                         ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold' 
                                         : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                                 }`}
                             >
                                 {variant}
                             </button>
                         ))}
                     </div>
                     <p className="text-xs text-editor-text-secondary mt-2 italic">
                        {currentVariant === 'classic' && '⚪ Simple circular images with centered text below.'}
                        {currentVariant === 'cards' && '🎴 Elevated cards with images and hover effects.'}
                        {currentVariant === 'minimal' && '✨ Clean modern layout with square images and grayscale effect.'}
                        {currentVariant === 'overlay' && '🖼️ Full image cards with text overlay on hover.'}
                     </p>
                 </div>

                <hr className="border-editor-border/50" />

                {/* --- STANDARD CONTROLS --- */}
                <h4 className="font-semibold text-editor-text-primary">Layout & Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Text" value={colors.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading" value={colors.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Accent" value={colors.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                </div>
                {(currentVariant === 'cards') && (
                    <div className="grid grid-cols-1 gap-4">
                        <ColorControl label="Card Background" value={colors.cardBackground || 'rgba(30, 41, 59, 0.5)'} onChange={v => handleColorChange('cardBackground', v)} />
                    </div>
                )}

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

    const renderFaqControls = () => {
        const s = styles as typeof componentStyles['faq'];
        const colors = (s.colors || {}) as any;
        const currentVariant = (s as any).faqVariant || 'classic';

        return (
            <div className="space-y-4">
                 {/* --- VARIANT SELECTOR --- */}
                 <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                     <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
                         <Layout size={14} />
                         FAQ Style
                     </label>
                     <div className="grid grid-cols-2 gap-2">
                         {['classic', 'cards', 'gradient', 'minimal'].map((variant) => (
                             <button
                                 key={variant}
                                 onClick={() => handleStyleChange('faqVariant', variant)}
                                 className={`px-3 py-2 rounded-md border text-xs transition-all capitalize ${
                                     currentVariant === variant
                                         ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold' 
                                         : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                                 }`}
                             >
                                 {variant}
                             </button>
                         ))}
                     </div>
                     <p className="text-xs text-editor-text-secondary mt-2 italic">
                        {currentVariant === 'classic' && '📋 Simple accordion with border dividers'}
                        {currentVariant === 'cards' && '🎴 Each FAQ in a separate card with shadow'}
                        {currentVariant === 'gradient' && '✨ Modern gradient cards with glow effects'}
                        {currentVariant === 'minimal' && '🎯 Clean minimal design with icons'}
                     </p>
                 </div>

                <hr className="border-editor-border/50" />

                {/* --- CARD STYLING --- */}
                {currentVariant !== 'classic' && (
                    <>
                        <h4 className="font-semibold text-editor-text-primary">Card Styling</h4>
                        <BorderRadiusControl 
                            label="Border Radius" 
                            value={(s as any).borderRadius || 'xl'} 
                            onChange={(v) => handleStyleChange('borderRadius', v)} 
                        />
                        <hr className="border-editor-border/50" />
                    </>
                )}

                {/* --- STANDARD CONTROLS --- */}
                <h4 className="font-semibold text-editor-text-primary">Layout & Spacing</h4>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                <hr className="border-editor-border/50" />
                
                <h4 className="font-semibold text-editor-text-primary">Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Text" value={colors.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading" value={colors.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Accent" value={colors.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Border Color" value={colors.borderColor || '#334155'} onChange={v => handleColorChange('borderColor', v)} />
                    {currentVariant === 'cards' && (
                        <ColorControl label="Card Background" value={colors.cardBackground || 'rgba(30, 41, 59, 0.5)'} onChange={v => handleColorChange('cardBackground', v)} />
                    )}
                </div>

                {/* Gradient Colors for Gradient Variant */}
                {currentVariant === 'gradient' && (
                    <div className="space-y-3 p-3 bg-editor-border/20 rounded-md animate-fade-in-up">
                        <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Gradient Colors</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <ColorControl label="Gradient Start" value={colors.gradientStart || '#4f46e5'} onChange={v => handleColorChange('gradientStart', v)} />
                            <ColorControl label="Gradient End" value={colors.gradientEnd || '#10b981'} onChange={v => handleColorChange('gradientEnd', v)} />
                        </div>
                    </div>
                )}

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

    const renderChatbotControls = () => {
        return (
            <div className="space-y-4">
                <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                    <h4 className="font-semibold text-editor-text-primary mb-2 flex items-center gap-2">
                        <Settings size={16} className="text-editor-accent" />
                        Chatbot Configuration
                    </h4>
                    <p className="text-sm text-editor-text-secondary">
                        The AI Chatbot is configured through the <strong>AI Assistant Dashboard</strong>. 
                        Go to Dashboard → AI Assistant to customize:
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-editor-text-secondary">
                        <li>• Agent name and tone</li>
                        <li>• Widget colors and appearance</li>
                        <li>• Business profile and FAQs</li>
                        <li>• Lead capture settings</li>
                        <li>• Voice and live chat features</li>
                    </ul>
                </div>
                <div className="bg-blue-600/10 p-4 rounded-lg border border-blue-600/30">
                    <p className="text-sm text-blue-300">
                        💡 <strong>Tip:</strong> The chatbot automatically adapts to your website's theme and appears in the bottom-right corner of your published site.
                    </p>
                </div>
            </div>
        );
    };

    const renderTypographyControls = () => {
        return (
            <div className="space-y-4">
                <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                    <h4 className="font-semibold text-editor-text-primary mb-2 flex items-center gap-2">
                        <Type size={16} className="text-editor-accent" />
                        Global Typography
                    </h4>
                    <p className="text-sm text-editor-text-secondary">
                        Typography is configured globally through <strong>Theme Settings</strong> in your project. 
                        These fonts apply to all components automatically:
                    </p>
                    <div className="mt-4 space-y-3">
                        <div className="p-3 bg-editor-bg rounded border border-editor-border">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase">Header Font</label>
                            <p className="text-editor-text-primary font-semibold mt-1">{theme.fontFamilyHeader}</p>
                            <p className="text-xs text-editor-text-secondary mt-1">Used for all headings and titles</p>
                        </div>
                        <div className="p-3 bg-editor-bg rounded border border-editor-border">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase">Body Font</label>
                            <p className="text-editor-text-primary font-semibold mt-1">{theme.fontFamilyBody}</p>
                            <p className="text-xs text-editor-text-secondary mt-1">Used for paragraphs and descriptions</p>
                        </div>
                        <div className="p-3 bg-editor-bg rounded border border-editor-border">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase">Button Font</label>
                            <p className="text-editor-text-primary font-semibold mt-1">{theme.fontFamilyButton}</p>
                            <p className="text-xs text-editor-text-secondary mt-1">Used for all buttons and CTAs</p>
                        </div>
                    </div>
                </div>
                <div className="bg-purple-600/10 p-4 rounded-lg border border-purple-600/30">
                    <p className="text-sm text-purple-300">
                        💡 <strong>Tip:</strong> To change these fonts, go to the main editor and access Theme Settings from the control panel.
                    </p>
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
            case 'services': return renderServicesControls();
            case 'menu': return renderMenuControls();
            case 'team': return renderTeamControls();
            case 'testimonials': return renderTestimonialsControls();
            case 'faq': return renderFaqControls();
            case 'chatbot': return renderChatbotControls();
            case 'typography': return renderTypographyControls();
            // Standard handlers for all other components that share similar structure
            case 'pricing':
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
