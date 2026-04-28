
import React, { useState } from 'react';
import { EditableComponentID, PaddingSize, FontSize, ImageStyle, BorderRadiusSize, BorderSize, JustifyContent, ImagePosition, AspectRatio, ObjectFit, ResponsiveStyles, AnimationConfig, ServiceIcon, AnimationType } from '../../../types';
import { useAdmin } from '../../../contexts/admin';
import { useProject } from '../../../contexts/project';
import { useTenant } from '../../../contexts/tenant';
import { componentStyles } from '../../../data/componentStyles';
import ColorControl from '../../ui/ColorControl';
import IconSelector from '../../ui/IconSelector';
import { Type, Layout, AlignJustify, Settings, Image, Plus, Trash2, Wand2, Palette, Clock, MapPin, Phone, Mail } from 'lucide-react';
import ResponsiveConfigEditor from './ResponsiveConfigEditor';
import AnimationConfigurator from './AnimationConfigurator';

// Simple re-usable controls from Controls.tsx
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="block text-sm font-medium text-q-text-secondary mb-1">{children}</label>
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
            className={`${checked ? 'bg-q-accent' : 'bg-q-surface-overlay'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-q-accent/40 focus:ring-offset-2 focus:ring-offset-editor-panel-bg`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-[20px]' : 'translate-x-0'} pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const PaddingControl: React.FC<{ label: string; value: PaddingSize; onChange: (value: PaddingSize) => void }> = ({ label, value, onChange }) => {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex bg-q-bg p-1 rounded-md space-x-1 border border-q-border">
                {(['sm', 'md', 'lg'] as PaddingSize[]).map(opt => (
                    <button key={opt} onClick={() => onChange(opt)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === opt ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>
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
            <div className="flex bg-q-bg p-1 rounded-md space-x-1 border border-q-border">
                {(['sm', 'md', 'lg', 'xl'] as FontSize[]).map(opt => (
                    <button key={opt} onClick={() => onChange(opt)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === opt ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>
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
            <div className="flex bg-q-bg p-1 rounded-md space-x-1 border border-q-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>{option.label}</button>
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
            <div className="flex bg-q-bg p-1 rounded-md space-x-1 border border-q-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>{option.label}</button>
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
            <div className="flex bg-q-bg p-1 rounded-md space-x-1 border border-q-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>{option.label}</button>
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
            <div className="flex bg-q-bg p-1 rounded-md space-x-1 border border-q-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>{option.label}</button>
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
            <div className="grid grid-cols-3 gap-1 bg-q-bg p-1 rounded-md border border-q-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>{option.label}</button>
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
            <div className="flex bg-q-bg p-1 rounded-md space-x-1 border border-q-border">
                {options.map(option => (
                    <button key={option.value} onClick={() => onChange(option.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === option.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>{option.label}</button>
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
            <div className="grid grid-cols-3 gap-1 bg-q-bg p-1 rounded-md border border-q-border">
                {options.map(opt => <button key={opt.value} onClick={() => onChange(opt.value)} className={`w-full text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${value === opt.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>{opt.label}</button>)}
            </div>
        </div>
    );
};


interface ComponentControlsProps {
    selectedComponentId: string;
}

const ComponentControls: React.FC<ComponentControlsProps> = ({ selectedComponentId }) => {
    const { componentStyles: contextStyles, customComponents, updateComponentStyle } = useAdmin();
    const { activeProject, saveProject, theme } = useProject();
    const { currentTenant } = useTenant();
    const [activeTab, setActiveTab] = useState<'styles' | 'responsive' | 'animation'>('styles');
    const [localRefresh, setLocalRefresh] = useState(0);

    const isCustom = !Object.keys(contextStyles).includes(selectedComponentId);

    const componentData = isCustom
        ? customComponents.find(c => c.id === selectedComponentId)
        : { baseComponent: selectedComponentId as EditableComponentID, styles: contextStyles[selectedComponentId as EditableComponentID] };

    if (!componentData) return <div className="p-4 text-q-text-secondary">Loading controls...</div>;

    const { baseComponent, styles } = componentData;

    const handleStyleChange = async (key: string, value: any) => {
        await updateComponentStyle(selectedComponentId, { [key]: value }, isCustom);
        setLocalRefresh(prev => prev + 1); // Force re-render
    };

    const handleColorChange = (colorName: string, value: string) => {
        // Get default colors from componentStyles to ensure we don't lose any colors
        const defaultColors = componentStyles[baseComponent]?.colors || {};
        const currentColors = styles?.colors || {};
        const newColors = { ...defaultColors, ...currentColors, [colorName]: value };
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
                {/* ========== HERO INFO ========== */}
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-2 flex items-center gap-2">
                        <Layout size={14} />
                        Hero Section
                    </label>
                    <p className="text-xs text-q-text-secondary">
                        📐 Full-width hero with background image, headline overlay, and call-to-action buttons. Use the content tab to change text and image.
                    </p>
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div>
                    <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                        <Type size={14} />
                        Typography
                    </h4>
                    <FontSizeControl label="Headline Size" value={heroStyles.headlineFontSize || 'lg'} onChange={v => handleStyleChange('headlineFontSize', v)} />
                    <FontSizeControl label="Subheadline Size" value={heroStyles.subheadlineFontSize || 'lg'} onChange={v => handleStyleChange('subheadlineFontSize', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== LAYOUT & SPACING ========== */}
                <div>
                    <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                        <AlignJustify size={14} />
                        Layout & Spacing
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <PaddingControl label="Vertical Padding" value={heroStyles.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                        <PaddingControl label="Horizontal Padding" value={heroStyles.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                    </div>
                </div>

                <hr className="border-q-border/50" />

                {/* ========== COLORS ========== */}
                <div>
                    <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                        <Settings size={14} />
                        Colors
                    </h4>

                    <div className="space-y-3 bg-q-bg/50 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                            <ColorControl label="Background" value={colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                            <ColorControl label="Body Text" value={colors?.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                        </div>

                        <ColorControl label="Heading" value={colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />

                        <div className="pt-2">
                            <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">Primary Button</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl label="Background" value={colors?.buttonBackground || '#4f46e5'} onChange={v => handleColorChange('buttonBackground', v)} />
                                <ColorControl label="Text" value={colors?.buttonText || '#ffffff'} onChange={v => handleColorChange('buttonText', v)} />
                            </div>
                        </div>

                        <div className="pt-2">
                            <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">Secondary Button</h5>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl label="Background" value={colors?.secondaryButtonBackground || '#334155'} onChange={v => handleColorChange('secondaryButtonBackground', v)} />
                                <ColorControl label="Text" value={colors?.secondaryButtonText || '#ffffff'} onChange={v => handleColorChange('secondaryButtonText', v)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    };

    const renderFeaturesControls = () => {
        const s = styles as typeof componentStyles['features'];

        // Asegurarse de que featuresVariant tenga un valor
        const currentVariant = (s as any).featuresVariant || 'classic';
        const currentTextAlignment = (s as any).overlayTextAlignment || 'left';
        const showHeader = (s as any).showSectionHeader !== false;

        return (
            <div className="space-y-4">
                {/* --- CONTROL DE VARIANTE --- */}
                <div>
                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-2">
                        Features Style
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                        <button
                            onClick={() => handleStyleChange('featuresVariant', 'classic')}
                            className={`px-3 py-2 rounded-md border transition-all text-sm ${currentVariant === 'classic'
                                ? 'bg-q-accent text-q-bg border-q-accent'
                                : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                }`}
                        >
                            Classic
                        </button>
                        <button
                            onClick={() => handleStyleChange('featuresVariant', 'modern')}
                            className={`px-3 py-2 rounded-md border transition-all text-sm ${currentVariant === 'modern'
                                ? 'bg-q-accent text-q-bg border-q-accent'
                                : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                }`}
                        >
                            Bento
                        </button>
                        <button
                            onClick={() => handleStyleChange('featuresVariant', 'bento-premium')}
                            className={`px-3 py-2 rounded-md border transition-all text-sm ${currentVariant === 'bento-premium'
                                ? 'bg-q-accent text-q-bg border-q-accent'
                                : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                }`}
                        >
                            Premium
                        </button>
                        <button
                            onClick={() => handleStyleChange('featuresVariant', 'image-overlay')}
                            className={`px-3 py-2 rounded-md border transition-all text-sm ${currentVariant === 'image-overlay'
                                ? 'bg-q-accent text-q-bg border-q-accent'
                                : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                }`}
                        >
                            Overlay
                        </button>
                    </div>
                    <p className="text-xs text-q-text-secondary mt-1">
                        {currentVariant === 'classic'
                            ? '📦 Traditional uniform grid layout'
                            : currentVariant === 'modern'
                                ? '✨ Modern asymmetrical bento grid layout'
                                : currentVariant === 'bento-premium'
                                    ? '🎯 Premium bento with featured first card'
                                    : '🖼️ Full-width images with text overlay'}
                    </p>
                </div>

                {/* --- CONTROLES ESPECÍFICOS PARA IMAGE-OVERLAY --- */}
                {currentVariant === 'image-overlay' && (
                    <>
                        <hr className="border-q-border/50" />
                        <div className="flex items-center space-x-2">
                            <Image size={16} className="text-q-accent" />
                            <h4 className="font-semibold text-q-text">Overlay Settings</h4>
                        </div>

                        {/* Text Alignment */}
                        <div>
                            <Label>Text Alignment</Label>
                            <div className="flex bg-q-bg p-1 rounded-md space-x-1 border border-q-border">
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <button
                                        key={align}
                                        onClick={() => handleStyleChange('overlayTextAlignment', align)}
                                        className={`flex-1 text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors capitalize ${currentTextAlignment === align
                                            ? 'bg-q-accent text-q-bg'
                                            : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                            }`}
                                    >
                                        {align === 'left' ? '⬅️ Left' : align === 'center' ? '↔️ Center' : '➡️ Right'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Show Section Header Toggle */}
                        <div className="flex items-center justify-between">
                            <Label>Show Section Header</Label>
                            <button
                                onClick={() => handleStyleChange('showSectionHeader', !showHeader)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${showHeader ? 'bg-q-accent' : 'bg-q-surface-overlay'
                                    }`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showHeader ? 'left-7' : 'left-1'
                                    }`} />
                            </button>
                        </div>
                    </>
                )}

                <hr className="border-q-border/50" />

                <h4 className="font-semibold text-q-text">Grid Layout</h4>
                <div>
                    <Label>Columns (Desktop)</Label>
                    <div className="flex bg-q-bg p-1 rounded-md space-x-1 border border-q-border">
                        {[2, 3, 4].map(cols => (
                            <button key={cols} onClick={() => handleStyleChange('gridColumns', cols)} className={`flex-1 text-center px-3 py-1 text-sm font-semibold rounded-sm transition-colors ${s.gridColumns === cols ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}>
                                {cols}
                            </button>
                        ))}
                    </div>
                </div>

                <h4 className="font-semibold text-q-text mt-4">Card Image</h4>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center">
                            <Label>Image Height</Label>
                            <span className="text-sm font-medium text-q-text">{s.imageHeight || 430}px</span>
                        </div>
                        <input
                            type="range" min="100" max="600" step="10"
                            value={s.imageHeight || 430}
                            onChange={e => handleStyleChange('imageHeight', parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <ObjectFitControl value={s.imageObjectFit || 'cover'} onChange={v => handleStyleChange('imageObjectFit', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />}
                    {<PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />}
                </div>

                <hr className="border-q-border/50" />

                {/* ========== CARD STYLING ========== */}
                <div className="flex items-center space-x-2">
                    <Settings size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Card Styling</h4>
                </div>
                <BorderRadiusControl
                    label="Card Border Radius"
                    value={(s as any).borderRadius || 'xl'}
                    onChange={(v) => handleStyleChange('borderRadius', v)}
                />

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />

                <hr className="border-q-border/50" />

                {/* ========== SECTION COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Section Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={s.colors?.background || '#0f172a'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Section Title" value={s.colors?.heading || '#F9FAFB'} onChange={v => handleColorChange('heading', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Section Description" value={s.colors?.description || '#94a3b8'} onChange={v => handleColorChange('description', v)} />
                    <ColorControl label="Accent" value={s.colors?.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== CARD COLORS ========== */}
                <h4 className="font-semibold text-q-text text-sm">Card Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Card Background" value={s.colors?.cardBackground || '#1e293b'} onChange={v => handleColorChange('cardBackground', v)} />
                    <ColorControl label="Card Title" value={s.colors?.cardHeading || '#ffffff'} onChange={v => handleColorChange('cardHeading', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Card Text" value={s.colors?.cardText || '#94a3b8'} onChange={v => handleColorChange('cardText', v)} />
                    <ColorControl label="Border Color" value={s.colors?.borderColor || '#334155'} onChange={v => handleColorChange('borderColor', v)} />
                </div>

                <hr className="border-q-border/50" />
                <div className="flex items-center space-x-2">
                    <Wand2 size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Animations</h4>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Enable Card Animations</Label>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={(s as any).enableCardAnimation !== false}
                            onClick={() => handleStyleChange('enableCardAnimation', !(s as any).enableCardAnimation !== false)}
                            className={`${(s as any).enableCardAnimation !== false ? 'bg-q-accent' : 'bg-q-surface-overlay'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out`}
                        >
                            <span
                                aria-hidden="true"
                                className={`${(s as any).enableCardAnimation !== false ? 'translate-x-[16px]' : 'translate-x-0'} pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out`}
                            />
                        </button>
                    </div>
                    {(s as any).enableCardAnimation !== false && (
                        <div>
                            <Label>Animation Type</Label>
                            <select
                                value={(s as any).animationType || 'fade-in-up'}
                                onChange={(e) => handleStyleChange('animationType', e.target.value as AnimationType)}
                                className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text focus:outline-none focus:ring-1 focus:ring-q-accent transition-all"
                            >
                                <option value="none">None</option>
                                <option value="fade-in">Fade In</option>
                                <option value="fade-in-up">Fade In Up</option>
                                <option value="fade-in-down">Fade In Down</option>
                                <option value="slide-up">Slide Up</option>
                                <option value="slide-down">Slide Down</option>
                                <option value="scale-in">Scale In</option>
                                <option value="bounce-in">Bounce In</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTestimonialsControls = () => {
        const s = styles as any;
        const currentVariant = s.testimonialsVariant || 'classic';

        return (
            <div className="space-y-4">
                <h4 className="font-semibold text-q-text">Testimonials Style</h4>
                <div>
                    <Label>Variant</Label>
                    <div className="grid grid-cols-2 gap-2 bg-q-bg p-1 rounded-md border border-q-border">
                        <button
                            onClick={() => handleStyleChange('testimonialsVariant', 'classic')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${currentVariant === 'classic'
                                ? 'bg-q-accent text-q-bg'
                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                }`}
                        >
                            📋 Classic
                        </button>
                        <button
                            onClick={() => handleStyleChange('testimonialsVariant', 'minimal-cards')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${currentVariant === 'minimal-cards'
                                ? 'bg-q-accent text-q-bg'
                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                }`}
                        >
                            ✨ Minimal
                        </button>
                        <button
                            onClick={() => handleStyleChange('testimonialsVariant', 'glassmorphism')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${currentVariant === 'glassmorphism'
                                ? 'bg-q-accent text-q-bg'
                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                }`}
                        >
                            💎 Glass
                        </button>
                        <button
                            onClick={() => handleStyleChange('testimonialsVariant', 'gradient-glow')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${currentVariant === 'gradient-glow'
                                ? 'bg-q-accent text-q-bg'
                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                }`}
                        >
                            🌟 Glow
                        </button>
                        <button
                            onClick={() => handleStyleChange('testimonialsVariant', 'neon-border')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${currentVariant === 'neon-border'
                                ? 'bg-q-accent text-q-bg'
                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                }`}
                        >
                            ⚡ Neon
                        </button>
                        <button
                            onClick={() => handleStyleChange('testimonialsVariant', 'floating-cards')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${currentVariant === 'floating-cards'
                                ? 'bg-q-accent text-q-bg'
                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                }`}
                        >
                            🎈 Float
                        </button>
                        <button
                            onClick={() => handleStyleChange('testimonialsVariant', 'gradient-shift')}
                            className={`px-3 py-2 text-xs font-semibold rounded-sm transition-colors ${currentVariant === 'gradient-shift'
                                ? 'bg-q-accent text-q-bg'
                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                }`}
                        >
                            🌈 Shift
                        </button>
                    </div>
                    <p className="text-xs text-q-text-secondary mt-1">
                        {currentVariant === 'classic' && '📋 Traditional cards with borders and shadows'}
                        {currentVariant === 'minimal-cards' && '✨ Clean minimal design with subtle borders'}
                        {currentVariant === 'glassmorphism' && '💎 Modern glass effect with blur'}
                        {currentVariant === 'gradient-glow' && '🌟 Gradient backgrounds with glow effects'}
                        {currentVariant === 'neon-border' && '⚡ Animated neon border with pulsing effect'}
                        {currentVariant === 'floating-cards' && '🎈 3D floating cards with depth and rotation'}
                        {currentVariant === 'gradient-shift' && '🌈 Animated shifting gradient backgrounds'}
                    </p>
                </div>

                <hr className="border-q-border/50" />

                <h4 className="font-semibold text-q-text">Card Styling</h4>
                <div className="space-y-4">
                    <BorderRadiusControl
                        label="Border Radius"
                        value={s.borderRadius || 'xl'}
                        onChange={(v) => handleStyleChange('borderRadius', v)}
                    />

                    {currentVariant === 'classic' && (
                        <div className="space-y-4 p-3 bg-q-surface-overlay/20 rounded-md animate-fade-in-up">
                            <div>
                                <Label>Border Style</Label>
                                <div className="grid grid-cols-2 gap-2 bg-q-bg p-1 rounded-md border border-q-border">
                                    {['none', 'solid', 'gradient', 'glow'].map(style => (
                                        <button
                                            key={style}
                                            onClick={() => handleStyleChange('borderStyle', style)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors capitalize ${(s.borderStyle || 'solid') === style
                                                ? 'bg-q-accent text-q-bg'
                                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                                }`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label>Card Shadow</Label>
                                <div className="grid grid-cols-3 gap-2 bg-q-bg p-1 rounded-md border border-q-border">
                                    {['none', 'sm', 'md', 'lg', 'xl'].map(shadow => (
                                        <button
                                            key={shadow}
                                            onClick={() => handleStyleChange('cardShadow', shadow)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors uppercase ${(s.cardShadow || 'lg') === shadow
                                                ? 'bg-q-accent text-q-bg'
                                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
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
                            <span className="text-sm font-medium text-q-text">{s.cardPadding || 32}px</span>
                        </div>
                        <input
                            type="range" min="16" max="64" step="4"
                            value={s.cardPadding || 32}
                            onChange={e => handleStyleChange('cardPadding', parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <hr className="border-q-border/50" />

                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />}
                    {<PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />}
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />

                <hr className="border-q-border/50" />

                {/* ========== COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Background" value={s.colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />}
                    {<ColorControl label="Body Text" value={s.colors?.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Heading Color" value={s.colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />}
                    {<ColorControl label="Description Color" value={s.colors?.description || '#94a3b8'} onChange={v => handleColorChange('description', v)} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Accent" value={s.colors?.accent || 'transparent'} onChange={v => handleColorChange('accent', v)} />}
                    {<ColorControl label="Border Color" value={s.colors?.borderColor || 'transparent'} onChange={v => handleColorChange('borderColor', v)} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Card Background" value={s.colors?.cardBackground || '#1f2937'} onChange={v => handleColorChange('cardBackground', v)} />}
                    {<ColorControl label="Card Title Color" value={s.colors?.subtitleColor || s.colors?.description || '#94a3b8'} onChange={v => handleColorChange('subtitleColor', v)} />}
                </div>
            </div>
        );
    };

    const renderNewsletterControls = () => {
        const s = styles as any;
        return (
            <div className="space-y-4">
                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />

                <hr className="border-q-border/50" />

                {/* ========== COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={s.colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Body Text" value={s.colors?.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading Color" value={s.colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Description Color" value={s.colors?.description || 'rgba(255, 255, 255, 0.8)'} onChange={v => handleColorChange('description', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Accent" value={s.colors?.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                </div>

                <hr className="border-q-border/50" />
                <h4 className="font-semibold text-q-text text-sm">Card Box Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Card Background" value={s.colors?.cardBackground || 'rgba(79, 70, 229, 0.75)'} onChange={v => handleColorChange('cardBackground', v)} />
                    <ColorControl label="Card Border" value={s.colors?.borderColor || '#374151'} onChange={v => handleColorChange('borderColor', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Card Heading" value={s.colors?.cardHeading || '#ffffff'} onChange={v => handleColorChange('cardHeading', v)} />
                    <ColorControl label="Card Text" value={s.colors?.cardText || '#ffffff'} onChange={v => handleColorChange('cardText', v)} />
                </div>

                <hr className="border-q-border/50" />
                <h4 className="font-semibold text-q-text text-sm">Input Field Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Input Background" value={s.colors?.inputBackground || '#111827'} onChange={v => handleColorChange('inputBackground', v)} />
                    <ColorControl label="Input Text" value={s.colors?.inputText || '#ffffff'} onChange={v => handleColorChange('inputText', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Placeholder" value={s.colors?.inputPlaceholder || '#6b7280'} onChange={v => handleColorChange('inputPlaceholder', v)} />
                    <ColorControl label="Input Border" value={s.colors?.inputBorder || '#374151'} onChange={v => handleColorChange('inputBorder', v)} />
                </div>

                <hr className="border-q-border/50" />
                <h4 className="font-semibold text-q-text text-sm">Button Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Button Background" value={s.colors?.buttonBackground || '#4f46e5'} onChange={v => handleColorChange('buttonBackground', v)} />
                    <ColorControl label="Button Text" value={s.colors?.buttonText || '#ffffff'} onChange={v => handleColorChange('buttonText', v)} />
                </div>
            </div>
        );
    };

    const renderHowItWorksControls = () => {
        const s = styles as any;
        return (
            <div className="space-y-4">
                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />

                <hr className="border-q-border/50" />

                {/* ========== COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={s.colors?.background || '#0f172a'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Accent (Circle)" value={s.colors?.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading" value={s.colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Description" value={s.colors?.description || '#94a3b8'} onChange={v => handleColorChange('description', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Text" value={s.colors?.text || '#94a3b8'} onChange={v => handleColorChange('text', v)} />
                </div>
            </div>
        );
    };

    const renderStandardControls = () => {
        const s = styles as any;
        return (
            <div className="space-y-4">
                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />}
                    {<PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />}
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />

                <hr className="border-q-border/50" />

                {/* ========== COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Background" value={s.colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />}
                    {<ColorControl label="Body Text" value={s.colors?.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Heading Color" value={s.colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />}
                    {<ColorControl label="Description Color" value={s.colors?.description || '#94a3b8'} onChange={v => handleColorChange('description', v)} />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {<ColorControl label="Accent" value={s.colors?.accent || 'transparent'} onChange={v => handleColorChange('accent', v)} />}
                    {<ColorControl label="Border Color" value={s.colors?.borderColor || 'transparent'} onChange={v => handleColorChange('borderColor', v)} />}
                </div>
            </div>
        );
    };

    const renderCtaControls = () => {
        const ctaStyles = styles as typeof componentStyles['cta'];
        const colors = (ctaStyles.colors || {}) as any;
        return (
            <div className="space-y-4">
                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={ctaStyles.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={ctaStyles.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={ctaStyles.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={ctaStyles.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />

                <hr className="border-q-border/50" />

                {/* ========== COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Body Text" value={colors?.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                    <ColorControl label="Heading Color" value={colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Description Color" value={colors?.description || 'rgba(255, 255, 255, 0.8)'} onChange={v => handleColorChange('description', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Gradient Start" value={colors?.gradientStart || '#0000ff'} onChange={v => handleColorChange('gradientStart', v)} />
                    <ColorControl label="Gradient End" value={colors?.gradientEnd || '#00ff00'} onChange={v => handleColorChange('gradientEnd', v)} />
                </div>
            </div>
        );
    };

    const renderFooterControls = () => {
        const s = styles as typeof componentStyles['footer'];
        const colors = (s.colors || {}) as any;
        const contactInfo = (s as any).contactInfo || {};
        const businessHours = contactInfo.businessHours || {};

        // Check subscription plan
        const plan = currentTenant?.subscriptionPlan || 'free';
        const canRemoveBranding = ['individual', 'agency_starter', 'agency_pro', 'agency_scale', 'enterprise'].includes(plan);

        // Helper to update contact info fields
        const handleContactInfoChange = (field: string, value: any) => {
            const newContactInfo = { ...contactInfo, [field]: value };
            handleStyleChange('contactInfo', newContactInfo);
        };

        // Helper to update business hours
        const handleBusinessHoursChange = (day: string, field: string, value: any) => {
            const newBusinessHours = {
                ...businessHours,
                [day]: {
                    ...(businessHours[day] || { isOpen: false, openTime: '09:00', closeTime: '17:00' }),
                    [field]: value
                }
            };
            handleContactInfoChange('businessHours', newBusinessHours);
        };

        // Apply hours to all days
        const applyToAllDays = (sourceDay: string) => {
            const sourceHours = businessHours[sourceDay] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };
            const newBusinessHours: any = {};
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            days.forEach(day => {
                newBusinessHours[day] = { ...sourceHours };
            });
            handleContactInfoChange('businessHours', newBusinessHours);
        };

        // Apply hours to weekdays only
        const applyToWeekdays = (sourceDay: string) => {
            const sourceHours = businessHours[sourceDay] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };
            const newBusinessHours = { ...businessHours };
            const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            weekdays.forEach(day => {
                newBusinessHours[day] = { ...sourceHours };
            });
            handleContactInfoChange('businessHours', newBusinessHours);
        };

        const DAYS = [
            { key: 'monday', label: 'Monday', short: 'Mon' },
            { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
            { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
            { key: 'thursday', label: 'Thursday', short: 'Thu' },
            { key: 'friday', label: 'Friday', short: 'Fri' },
            { key: 'saturday', label: 'Saturday', short: 'Sat' },
            { key: 'sunday', label: 'Sunday', short: 'Sun' },
        ];

        return (
            <div className="space-y-4">
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                        <Layout size={14} />
                        Branding
                    </h4>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <Label>Hide "Made with Quimera"</Label>
                                <span className="text-xs text-q-text-secondary">Remove the branding badge from your site</span>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                disabled={!canRemoveBranding}
                                aria-checked={s.hideBranding || false}
                                onClick={() => handleStyleChange('hideBranding', !s.hideBranding)}
                                className={`${s.hideBranding ? 'bg-q-accent' : 'bg-q-surface-overlay'} ${!canRemoveBranding ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out`}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`${s.hideBranding ? 'translate-x-[20px]' : 'translate-x-0'} pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out`}
                                />
                            </button>
                        </div>

                        {!canRemoveBranding && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
                                <p className="text-xs text-blue-400 flex gap-2">
                                    <span className="font-bold">PRO Feature:</span>
                                    Upgrade to PRO or Agency plan to remove Quimera branding.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <hr className="border-q-border/50" />
                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'sm'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'sm'} onChange={v => handleStyleChange('descriptionFontSize', v)} />

                <hr className="border-q-border/50" />

                {/* ========== CONTACT INFORMATION ========== */}
                <div className="flex items-center space-x-2">
                    <MapPin size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Contact Information</h4>
                </div>

                <div className="space-y-3 p-3 bg-q-surface-overlay/20 rounded-md">
                    <div>
                        <Label>Address</Label>
                        <input
                            type="text"
                            value={contactInfo.address || ''}
                            onChange={(e) => handleContactInfoChange('address', e.target.value)}
                            placeholder="123 Main Street"
                            className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>City</Label>
                            <input
                                type="text"
                                value={contactInfo.city || ''}
                                onChange={(e) => handleContactInfoChange('city', e.target.value)}
                                placeholder="City"
                                className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                            />
                        </div>
                        <div>
                            <Label>State</Label>
                            <input
                                type="text"
                                value={contactInfo.state || ''}
                                onChange={(e) => handleContactInfoChange('state', e.target.value)}
                                placeholder="State"
                                className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>ZIP Code</Label>
                            <input
                                type="text"
                                value={contactInfo.zipCode || ''}
                                onChange={(e) => handleContactInfoChange('zipCode', e.target.value)}
                                placeholder="12345"
                                className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                            />
                        </div>
                        <div>
                            <Label>Country</Label>
                            <input
                                type="text"
                                value={contactInfo.country || ''}
                                onChange={(e) => handleContactInfoChange('country', e.target.value)}
                                placeholder="Country"
                                className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Phone</Label>
                        <div className="flex items-center gap-2">
                            <Phone size={14} className="text-q-text-secondary flex-shrink-0" />
                            <input
                                type="tel"
                                value={contactInfo.phone || ''}
                                onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                                placeholder="+1 (555) 123-4567"
                                className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Email</Label>
                        <div className="flex items-center gap-2">
                            <Mail size={14} className="text-q-text-secondary flex-shrink-0" />
                            <input
                                type="email"
                                value={contactInfo.email || ''}
                                onChange={(e) => handleContactInfoChange('email', e.target.value)}
                                placeholder="contact@example.com"
                                className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-q-border/50" />

                {/* ========== BUSINESS HOURS ========== */}
                <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Business Hours</h4>
                </div>

                <div className="space-y-2 p-3 bg-q-surface-overlay/20 rounded-md">
                    {/* Quick actions */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => applyToWeekdays('monday')}
                            className="text-xs px-2 py-1 bg-q-accent/20 text-q-accent rounded hover:bg-q-accent/30 transition-colors"
                        >
                            Copy Mon → Weekdays
                        </button>
                        <button
                            onClick={() => applyToAllDays('monday')}
                            className="text-xs px-2 py-1 bg-q-accent/20 text-q-accent rounded hover:bg-q-accent/30 transition-colors"
                        >
                            Copy Mon → All Days
                        </button>
                    </div>

                    {DAYS.map(({ key, label, short }) => {
                        const dayHours = businessHours[key] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };
                        return (
                            <div key={key} className="flex items-center gap-2 py-1">
                                <span className="w-10 text-xs font-medium text-q-text-secondary">{short}</span>
                                <button
                                    onClick={() => handleBusinessHoursChange(key, 'isOpen', !dayHours.isOpen)}
                                    className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${dayHours.isOpen ? 'bg-green-500' : 'bg-q-surface-overlay'
                                        }`}
                                >
                                    <span
                                        className={`block w-4 h-4 rounded-full bg-white transform transition-transform mx-1 ${dayHours.isOpen ? 'translate-x-6' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                                {dayHours.isOpen ? (
                                    <div className="flex items-center gap-1 flex-1">
                                        <input
                                            type="time"
                                            value={dayHours.openTime || '09:00'}
                                            onChange={(e) => handleBusinessHoursChange(key, 'openTime', e.target.value)}
                                            className="w-24 bg-q-bg border border-q-border rounded px-2 py-1 text-xs text-q-text"
                                        />
                                        <span className="text-q-text-secondary text-xs">-</span>
                                        <input
                                            type="time"
                                            value={dayHours.closeTime || '17:00'}
                                            onChange={(e) => handleBusinessHoursChange(key, 'closeTime', e.target.value)}
                                            className="w-24 bg-q-bg border border-q-border rounded px-2 py-1 text-xs text-q-text"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-xs text-q-text-secondary italic">Closed</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <hr className="border-q-border/50" />

                {/* ========== COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Body Text" value={colors?.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading Color" value={colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Description Color" value={colors?.description || '#94a3b8'} onChange={v => handleColorChange('description', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Link Hover" value={colors?.linkHover || '#aaaaaa'} onChange={v => handleColorChange('linkHover', v)} />
                    <ColorControl label="Border" value={colors?.border || 'transparent'} onChange={v => handleColorChange('border', v)} />
                </div>
            </div>
        );
    };

    const renderHeaderControls = () => {
        const s = styles as any;
        const colors = (s.colors || {}) as any;

        return (
            <div className="space-y-4">
                {/* ========== LAYOUT & STYLE ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout & Style</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Layout</Label>
                        <select
                            value={s.layout || 'classic'}
                            onChange={(e) => handleStyleChange('layout', e.target.value)}
                            className="w-full bg-q-surface border border-q-border rounded-md px-2 py-2 text-sm text-q-text"
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
                            className="w-full bg-q-surface border border-q-border rounded-md px-2 py-2 text-sm text-q-text"
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
                        <span className="text-sm font-medium text-q-text">{s.height || 70}px</span>
                    </div>
                    <input
                        type="range" min="50" max="120" step="5"
                        value={s.height || 70}
                        onChange={e => handleStyleChange('height', parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <hr className="border-q-border/50" />

                <h4 className="font-semibold text-q-text">Logo</h4>
                <div>
                    <Label>Logo Type</Label>
                    <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
                        {['text', 'image', 'both'].map(type => (
                            <button
                                key={type}
                                onClick={() => handleStyleChange('logoType', type)}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors capitalize ${(s.logoType || 'text') === type
                                    ? 'bg-q-accent text-q-bg'
                                    : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {((s.logoType || 'text') === 'image' || (s.logoType || 'text') === 'both') && (
                    <div className="space-y-3 p-3 bg-q-surface-overlay/20 rounded-md">
                        <div>
                            <Label>Logo Image URL</Label>
                            <input
                                type="text"
                                value={s.logoImageUrl || ''}
                                onChange={(e) => handleStyleChange('logoImageUrl', e.target.value)}
                                placeholder="https://example.com/logo.png"
                                className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                            />
                        </div>

                        {s.logoImageUrl && (
                            <div className="border border-q-border rounded-md p-2 bg-q-bg">
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
                                <span className="text-sm font-medium text-q-text">{s.logoWidth || 120}px</span>
                            </div>
                            <input
                                type="range" min="40" max="300" step="5"
                                value={s.logoWidth || 120}
                                onChange={e => handleStyleChange('logoWidth', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer"
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
                            className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                        />
                    </div>
                )}

                <hr className="border-q-border/50" />

                <h4 className="font-semibold text-q-text">Call-to-Action Button</h4>
                <ToggleControl label="Show CTA Button" checked={s.showCta !== false} onChange={(v) => handleStyleChange('showCta', v)} />

                {s.showCta !== false && (
                    <div className="space-y-3 p-3 bg-q-surface-overlay/20 rounded-md animate-fade-in-up">
                        <div>
                            <Label>Button Text</Label>
                            <input
                                type="text"
                                value={s.ctaText || 'Get Started'}
                                onChange={(e) => handleStyleChange('ctaText', e.target.value)}
                                className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                            />
                        </div>

                        <BorderRadiusControl
                            label="Button Radius"
                            value={s.buttonBorderRadius || 'md'}
                            onChange={(v) => handleStyleChange('buttonBorderRadius', v)}
                        />
                    </div>
                )}

                <hr className="border-q-border/50" />

                <h4 className="font-semibold text-q-text">Login Button</h4>
                <ToggleControl label="Show Login Button" checked={s.showLogin !== false} onChange={(v) => handleStyleChange('showLogin', v)} />

                {s.showLogin !== false && (
                    <div className="space-y-3 p-3 bg-q-surface-overlay/20 rounded-md animate-fade-in-up">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Login Text</Label>
                                <input
                                    type="text"
                                    value={s.loginText || 'Login'}
                                    onChange={(e) => handleStyleChange('loginText', e.target.value)}
                                    className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                                />
                            </div>
                            <div>
                                <Label>Login URL</Label>
                                <input
                                    type="text"
                                    value={s.loginUrl || '#'}
                                    onChange={(e) => handleStyleChange('loginUrl', e.target.value)}
                                    className="w-full bg-q-bg border border-q-border rounded-md px-3 py-2 text-sm text-q-text"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <hr className="border-q-border/50" />

                <h4 className="font-semibold text-q-text">Navigation Links</h4>
                <div>
                    <Label>Hover Style</Label>
                    <select
                        value={s.hoverStyle || 'underline'}
                        onChange={(e) => handleStyleChange('hoverStyle', e.target.value)}
                        className="w-full bg-q-surface border border-q-border rounded-md px-2 py-2 text-sm text-q-text"
                    >
                        <option value="underline">Underline</option>
                        <option value="bold">Bold</option>
                        <option value="scale">Scale</option>
                        <option value="glow">Glow</option>
                    </select>
                </div>

                <div>
                    <div className="flex justify-between items-center">
                        <Label>Link Font Size</Label>
                        <span className="text-sm font-medium text-q-text">{s.linkFontSize || 14}px</span>
                    </div>
                    <input
                        type="range" min="10" max="24" step="1"
                        value={s.linkFontSize || 14}
                        onChange={e => handleStyleChange('linkFontSize', parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors?.background || '#ffffff'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Text" value={colors?.text || '#000000'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Accent" value={colors?.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                    <ColorControl label="Border" value={colors?.border || 'transparent'} onChange={v => handleColorChange('border', v)} />
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
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                        <Layout size={14} />
                        Menu Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {['classic', 'modern-grid', 'elegant-list'].map((variant) => (
                            <button
                                key={variant}
                                onClick={() => handleStyleChange('menuVariant', variant)}
                                className={`px-2 py-2 rounded-md border text-xs transition-all ${currentVariant === variant
                                    ? 'bg-q-accent text-q-bg border-q-accent shadow-sm font-bold'
                                    : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                    }`}
                            >
                                {variant === 'classic' && '🍽️ Classic'}
                                {variant === 'modern-grid' && '✨ Modern'}
                                {variant === 'elegant-list' && '📋 Elegant'}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-q-text-secondary mt-2 italic">
                        {currentVariant === 'classic' && '🍽️ Traditional grid cards with images on top.'}
                        {currentVariant === 'modern-grid' && '✨ Bento-style grid with dynamic layouts.'}
                        {currentVariant === 'elegant-list' && '📋 Magazine-style horizontal list layout.'}
                    </p>
                </div>

                <hr className="border-q-border/50" />

                {/* --- ICON CONTROLS --- */}
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
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

                <hr className="border-q-border/50" />

                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FontSizeControl label="Title Font Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                    <FontSizeControl label="Description Font Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== SECTION COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Section Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Section Title" value={colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Section Text" value={colors?.text || '#94a3b8'} onChange={v => handleColorChange('text', v)} />
                    <ColorControl label="Accent" value={colors?.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== CARD COLORS ========== */}
                <h4 className="font-semibold text-q-text text-sm">Card Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Card Background" value={colors?.cardBackground || '#1e293b'} onChange={v => handleColorChange('cardBackground', v)} />
                    <ColorControl label="Card Title" value={colors?.cardTitleColor || '#ffffff'} onChange={v => handleColorChange('cardTitleColor', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Card Text" value={colors?.cardText || '#94a3b8'} onChange={v => handleColorChange('cardText', v)} />
                    <ColorControl label="Price Color" value={colors?.priceColor || '#10b981'} onChange={v => handleColorChange('priceColor', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Border Color" value={colors?.borderColor || '#334155'} onChange={v => handleColorChange('borderColor', v)} />
                </div>
            </div>
        );
    };

    const renderMapControls = () => {
        const s = styles as any;
        const colors = (s.colors || {}) as any;
        const currentVariant = s.mapVariant || 'modern';

        return (
            <div className="space-y-4">
                {/* --- VARIANT SELECTOR --- */}
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                        <Layout size={14} />
                        Map Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {['modern', 'minimal', 'dark-tech', 'retro', 'night'].map((variant) => (
                            <button
                                key={variant}
                                onClick={() => handleStyleChange('mapVariant', variant)}
                                className={`px-2 py-2 rounded-md border text-xs transition-all ${currentVariant === variant
                                    ? 'bg-q-accent text-q-bg border-q-accent shadow-sm font-bold'
                                    : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                    }`}
                            >
                                {variant === 'modern' && '🗺️ Modern'}
                                {variant === 'minimal' && '✨ Minimal'}
                                {variant === 'dark-tech' && '🌑 Dark Tech'}
                                {variant === 'retro' && '🏛️ Retro'}
                                {variant === 'night' && '🌙 Night'}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-q-text-secondary mt-2 italic">
                        {currentVariant === 'modern' && '🗺️ Split layout with info card on the left.'}
                        {currentVariant === 'minimal' && '✨ Clean map with floating badge.'}
                        {currentVariant === 'dark-tech' && '🌑 Dark mode with tech overlay card.'}
                        {currentVariant === 'retro' && '🏛️ Vintage map style with bottom bar.'}
                        {currentVariant === 'night' && '🌙 Night mode with bottom info bar.'}
                    </p>
                </div>

                <hr className="border-q-border/50" />

                {/* --- MAP SIZE --- */}
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                        <Settings size={14} />
                        Map Settings
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Map Height</Label>
                                <span className="text-sm font-medium text-q-text">{s.height || 400}px</span>
                            </div>
                            <input
                                type="range" min="200" max="800" step="50"
                                value={s.height || 400}
                                onChange={e => handleStyleChange('height', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Zoom Level</Label>
                                <span className="text-sm font-medium text-q-text">{s.zoom || 15}</span>
                            </div>
                            <input
                                type="range" min="10" max="20" step="1"
                                value={s.zoom || 15}
                                onChange={e => handleStyleChange('zoom', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-q-border/50" />

                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FontSizeControl label="Title Font Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                    <FontSizeControl label="Description Font Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors?.background || '#0f172a'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Text" value={colors?.text || '#94a3b8'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading" value={colors?.heading || '#F9FAFB'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Description" value={colors?.description || '#94a3b8'} onChange={v => handleColorChange('description', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Accent" value={colors?.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                    <ColorControl label="Card Background" value={colors?.cardBackground || '#1e293b'} onChange={v => handleColorChange('cardBackground', v)} />
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
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                        <Layout size={14} />
                        Services Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {['cards', 'grid', 'minimal'].map((variant) => (
                            <button
                                key={variant}
                                onClick={() => handleStyleChange('servicesVariant', variant)}
                                className={`px-2 py-2 rounded-md border text-xs transition-all capitalize ${currentVariant === variant
                                    ? 'bg-q-accent text-q-bg border-q-accent shadow-sm font-bold'
                                    : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                    }`}
                            >
                                {variant}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-q-text-secondary mt-2 italic">
                        {currentVariant === 'cards' && 'Standard centered cards with hover effects.'}
                        {currentVariant === 'grid' && 'Modern bento-style grid with left alignment.'}
                        {currentVariant === 'minimal' && 'Clean list layout for a professional look.'}
                    </p>
                </div>

                <hr className="border-q-border/50" />

                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />

                <hr className="border-q-border/50" />

                {/* ========== SECTION COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Section Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Section Title" value={colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Section Description" value={colors?.description || '#94a3b8'} onChange={v => handleColorChange('description', v)} />
                    <ColorControl label="Accent" value={colors?.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== CARD COLORS ========== */}
                <h4 className="font-semibold text-q-text text-sm">Card Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Card Title" value={colors?.cardHeading || '#ffffff'} onChange={v => handleColorChange('cardHeading', v)} />
                    <ColorControl label="Card Text" value={colors?.cardText || '#94a3b8'} onChange={v => handleColorChange('cardText', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Border" value={colors?.borderColor || 'transparent'} onChange={v => handleColorChange('borderColor', v)} />
                </div>
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
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                        <Layout size={14} />
                        Team Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {['classic', 'cards', 'minimal', 'overlay'].map((variant) => (
                            <button
                                key={variant}
                                onClick={() => handleStyleChange('teamVariant', variant)}
                                className={`px-3 py-2 rounded-md border text-xs transition-all capitalize ${currentVariant === variant
                                    ? 'bg-q-accent text-q-bg border-q-accent shadow-sm font-bold'
                                    : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                    }`}
                            >
                                {variant}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-q-text-secondary mt-2 italic">
                        {currentVariant === 'classic' && '⚪ Simple circular images with centered text below.'}
                        {currentVariant === 'cards' && '🎴 Elevated cards with images and hover effects.'}
                        {currentVariant === 'minimal' && '✨ Clean modern layout with square images and grayscale effect.'}
                        {currentVariant === 'overlay' && '🖼️ Full image cards with text overlay on hover.'}
                    </p>
                </div>

                <hr className="border-q-border/50" />

                {/* ========== LAYOUT ========== */}
                <div className="flex items-center space-x-2">
                    <AlignJustify size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Layout</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== TYPOGRAPHY ========== */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />

                <hr className="border-q-border/50" />

                {/* ========== SECTION COLORS ========== */}
                <div className="flex items-center space-x-2">
                    <Palette size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Section Colors</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Section Title" value={colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Section Description" value={colors?.description || '#94a3b8'} onChange={v => handleColorChange('description', v)} />
                    <ColorControl label="Accent" value={colors?.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                </div>

                <hr className="border-q-border/50" />

                {/* ========== CARD COLORS ========== */}
                <h4 className="font-semibold text-q-text text-sm">Card Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Card Background" value={colors?.cardBackground || 'rgba(30, 41, 59, 0.5)'} onChange={v => handleColorChange('cardBackground', v)} />
                    <ColorControl label="Card Name" value={colors?.cardHeading || '#ffffff'} onChange={v => handleColorChange('cardHeading', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Card Role" value={colors?.cardText || '#94a3b8'} onChange={v => handleColorChange('cardText', v)} />
                </div>
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
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                        <Layout size={14} />
                        FAQ Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {['classic', 'cards', 'gradient', 'minimal'].map((variant) => (
                            <button
                                key={variant}
                                onClick={() => handleStyleChange('faqVariant', variant)}
                                className={`px-3 py-2 rounded-md border text-xs transition-all capitalize ${currentVariant === variant
                                    ? 'bg-q-accent text-q-bg border-q-accent shadow-sm font-bold'
                                    : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                    }`}
                            >
                                {variant}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-q-text-secondary mt-2 italic">
                        {currentVariant === 'classic' && '📋 Simple accordion with border dividers'}
                        {currentVariant === 'cards' && '🎴 Each FAQ in a separate card with shadow'}
                        {currentVariant === 'gradient' && '✨ Modern gradient cards with glow effects'}
                        {currentVariant === 'minimal' && '🎯 Clean minimal design with icons'}
                    </p>
                </div>

                <hr className="border-q-border/50" />

                {/* --- CARD STYLING --- */}
                {currentVariant !== 'classic' && (
                    <>
                        <h4 className="font-semibold text-q-text">Card Styling</h4>
                        <BorderRadiusControl
                            label="Border Radius"
                            value={(s as any).borderRadius || 'xl'}
                            onChange={(v) => handleStyleChange('borderRadius', v)}
                        />
                        <hr className="border-q-border/50" />
                    </>
                )}

                {/* --- STANDARD CONTROLS --- */}
                <h4 className="font-semibold text-q-text">Layout & Spacing</h4>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                <hr className="border-q-border/50" />

                <h4 className="font-semibold text-q-text">Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors?.background || '#000000'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Text" value={colors?.text || '#ffffff'} onChange={v => handleColorChange('text', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Heading" value={colors?.heading || '#ffffff'} onChange={v => handleColorChange('heading', v)} />
                    <ColorControl label="Description" value={colors?.description || 'rgba(255, 255, 255, 0.8)'} onChange={v => handleColorChange('description', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Accent" value={colors?.accent || '#4f46e5'} onChange={v => handleColorChange('accent', v)} />
                    <ColorControl label="Border Color" value={colors?.borderColor || '#334155'} onChange={v => handleColorChange('borderColor', v)} />
                </div>
                {currentVariant === 'cards' && (
                    <div className="grid grid-cols-2 gap-4">
                        <ColorControl label="Card Background" value={colors?.cardBackground || 'rgba(30, 41, 59, 0.5)'} onChange={v => handleColorChange('cardBackground', v)} />
                    </div>
                )}

                {/* Gradient Colors for Gradient Variant */}
                {currentVariant === 'gradient' && (
                    <div className="space-y-3 p-3 bg-q-surface-overlay/20 rounded-md animate-fade-in-up">
                        <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">Gradient Colors</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <ColorControl label="Gradient Start" value={colors?.gradientStart || '#4f46e5'} onChange={v => handleColorChange('gradientStart', v)} />
                            <ColorControl label="Gradient End" value={colors?.gradientEnd || '#10b981'} onChange={v => handleColorChange('gradientEnd', v)} />
                        </div>
                    </div>
                )}

                <hr className="border-q-border/50" />
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
                <FontSizeControl label="Description Size" value={s.descriptionFontSize || 'md'} onChange={v => handleStyleChange('descriptionFontSize', v)} />
            </div>
        );
    };

    const renderChatbotControls = () => {
        return (
            <div className="space-y-4">
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <h4 className="font-semibold text-q-text mb-2 flex items-center gap-2">
                        <Settings size={16} className="text-q-accent" />
                        Chatbot Configuration
                    </h4>
                    <p className="text-sm text-q-text-secondary">
                        The AI Chatbot is configured through the <strong>AI Assistant Dashboard</strong>.
                        Go to Dashboard → AI Assistant to customize:
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-q-text-secondary">
                        <li>• Agent name and tone</li>
                        <li>• Widget colors and appearance</li>
                        <li>• Business profile and FAQs</li>
                        <li>• Lead capture settings</li>
                        <li>• Voice and live chat features</li>
                    </ul>
                </div>
            </div>
        );
    };

    const renderTypographyControls = () => {
        return (
            <div className="space-y-4">
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <h4 className="font-semibold text-q-text mb-2 flex items-center gap-2">
                        <Type size={16} className="text-q-accent" />
                        Global Typography
                    </h4>
                    <p className="text-sm text-q-text-secondary">
                        Typography is configured globally through <strong>Theme Settings</strong> in your project.
                        These fonts apply to all components automatically:
                    </p>
                    <div className="mt-4 space-y-3">
                        <div className="p-3 bg-q-bg rounded border border-q-border">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">Header Font</label>
                            <p className="text-q-text font-semibold mt-1">{theme.fontFamilyHeader}</p>
                            <p className="text-xs text-q-text-secondary mt-1">Used for all headings and titles</p>
                        </div>
                        <div className="p-3 bg-q-bg rounded border border-q-border">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">Body Font</label>
                            <p className="text-q-text font-semibold mt-1">{theme.fontFamilyBody}</p>
                            <p className="text-xs text-q-text-secondary mt-1">Used for paragraphs and descriptions</p>
                        </div>
                        <div className="p-3 bg-q-bg rounded border border-q-border">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">Button Font</label>
                            <p className="text-q-text font-semibold mt-1">{theme.fontFamilyButton}</p>
                            <p className="text-xs text-q-text-secondary mt-1">Used for all buttons and CTAs</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderColorsControls = () => {
        const globalColors = theme.globalColors || {} as any;
        return (
            <div className="space-y-4">
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <h4 className="font-semibold text-q-text mb-2 flex items-center gap-2">
                        <Palette size={16} className="text-q-accent" />
                        Global Colors
                    </h4>
                    <p className="text-sm text-q-text-secondary">
                        Colors are configured globally through <strong>Theme Settings</strong> in your project.
                        These colors apply to all components automatically:
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="p-3 bg-q-bg rounded border border-q-border">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">Primary</label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded border border-q-border" style={{ backgroundColor: globalColors.primary || '#4f46e5' }} />
                                <p className="text-q-text text-sm font-mono">{globalColors.primary || '#4f46e5'}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-q-bg rounded border border-q-border">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">Secondary</label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded border border-q-border" style={{ backgroundColor: globalColors.secondary || '#10b981' }} />
                                <p className="text-q-text text-sm font-mono">{globalColors.secondary || '#10b981'}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-q-bg rounded border border-q-border">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">Background</label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded border border-q-border" style={{ backgroundColor: globalColors.background || '#0f172a' }} />
                                <p className="text-q-text text-sm font-mono">{globalColors.background || '#0f172a'}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-q-bg rounded border border-q-border">
                            <label className="text-xs font-bold text-q-text-secondary uppercase">Text</label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded border border-q-border" style={{ backgroundColor: globalColors.text || '#94a3b8' }} />
                                <p className="text-q-text text-sm font-mono">{globalColors.text || '#94a3b8'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderSlideshowControls = () => {
        const s = styles as any;
        const colors = (s.colors || {}) as any;
        const currentVariant = s.slideshowVariant || 'classic';

        return (
            <div className="space-y-4">
                {/* --- VARIANT SELECTOR --- */}
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
                        <Layout size={14} />
                        Slideshow Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { value: 'classic', label: '📷 Classic', desc: 'Standard slide transitions' },
                            { value: 'kenburns', label: '🎬 Ken Burns', desc: 'Cinematic zoom effect' },
                            { value: 'cards3d', label: '🎴 3D Cards', desc: '3D perspective cards' },
                            { value: 'thumbnails', label: '🖼️ Thumbnails', desc: 'With thumbnail navigation' }
                        ].map((variant) => (
                            <button
                                key={variant.value}
                                onClick={() => handleStyleChange('slideshowVariant', variant.value)}
                                className={`px-3 py-2 rounded-md border text-xs transition-all ${currentVariant === variant.value
                                    ? 'bg-q-accent text-q-bg border-q-accent shadow-sm font-bold'
                                    : 'bg-q-surface text-q-text border-q-border hover:border-q-accent'
                                    }`}
                            >
                                {variant.label}
                            </button>
                        ))}
                    </div>
                </div>

                <hr className="border-q-border/50" />

                {/* --- LAYOUT OPTIONS --- */}
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                        <Layout size={14} />
                        Layout Options
                    </h4>
                    <div className="space-y-4">
                        <ToggleControl
                            label="Full Width"
                            checked={s.fullWidth || false}
                            onChange={(v) => handleStyleChange('fullWidth', v)}
                        />
                        <p className="text-xs text-q-text-secondary -mt-2">
                            {s.fullWidth ? '🖼️ Slideshow spans the entire screen width' : '📦 Slideshow is contained within max-width'}
                        </p>

                        <ToggleControl
                            label="Show Title"
                            checked={s.showTitle !== false}
                            onChange={(v) => handleStyleChange('showTitle', v)}
                        />

                        {s.fullWidth && (
                            <div className="animate-fade-in-up">
                                <div className="flex justify-between items-center">
                                    <Label>Slide Height</Label>
                                    <span className="text-sm font-medium text-q-text">{s.slideHeight || 600}px</span>
                                </div>
                                <input
                                    type="range" min="300" max="900" step="50"
                                    value={s.slideHeight || 600}
                                    onChange={e => handleStyleChange('slideHeight', parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer accent-editor-accent"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <hr className="border-q-border/50" />

                {/* --- TRANSITION SETTINGS --- */}
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <h4 className="font-semibold text-q-text mb-3 flex items-center gap-2">
                        <Settings size={14} />
                        Transition Settings
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <Label>Transition Effect</Label>
                            <div className="grid grid-cols-3 gap-2 bg-q-bg p-1 rounded-md border border-q-border">
                                {['slide', 'fade', 'zoom'].map(effect => (
                                    <button
                                        key={effect}
                                        onClick={() => handleStyleChange('transitionEffect', effect)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors capitalize ${(s.transitionEffect || 'slide') === effect
                                            ? 'bg-q-accent text-q-bg'
                                            : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                            }`}
                                    >
                                        {effect}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center">
                                <Label>Auto-play Speed</Label>
                                <span className="text-sm font-medium text-q-text">{((s.autoPlaySpeed || 5000) / 1000).toFixed(1)}s</span>
                            </div>
                            <input
                                type="range" min="2000" max="10000" step="500"
                                value={s.autoPlaySpeed || 5000}
                                onChange={e => handleStyleChange('autoPlaySpeed', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer accent-editor-accent"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center">
                                <Label>Transition Duration</Label>
                                <span className="text-sm font-medium text-q-text">{s.transitionDuration || 500}ms</span>
                            </div>
                            <input
                                type="range" min="200" max="1500" step="100"
                                value={s.transitionDuration || 500}
                                onChange={e => handleStyleChange('transitionDuration', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer accent-editor-accent"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-q-border/50" />

                {/* --- CONTROLS --- */}
                <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
                    <h4 className="font-semibold text-q-text mb-3">Navigation Controls</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <ToggleControl
                                label="Show Arrows"
                                checked={s.showArrows !== false}
                                onChange={(v) => handleStyleChange('showArrows', v)}
                            />
                            <ToggleControl
                                label="Show Dots"
                                checked={s.showDots !== false}
                                onChange={(v) => handleStyleChange('showDots', v)}
                            />
                        </div>

                        <ToggleControl
                            label="Show Captions"
                            checked={s.showCaptions || false}
                            onChange={(v) => handleStyleChange('showCaptions', v)}
                        />

                        {s.showArrows !== false && (
                            <div className="animate-fade-in-up">
                                <Label>Arrow Style</Label>
                                <div className="grid grid-cols-4 gap-2 bg-q-bg p-1 rounded-md border border-q-border">
                                    {['rounded', 'square', 'minimal', 'floating'].map(style => (
                                        <button
                                            key={style}
                                            onClick={() => handleStyleChange('arrowStyle', style)}
                                            className={`px-2 py-1.5 text-xs font-semibold rounded-sm transition-colors capitalize ${(s.arrowStyle || 'rounded') === style
                                                ? 'bg-q-accent text-q-bg'
                                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                                }`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {s.showDots !== false && (
                            <div className="animate-fade-in-up">
                                <Label>Dot Style</Label>
                                <div className="grid grid-cols-4 gap-2 bg-q-bg p-1 rounded-md border border-q-border">
                                    {['circle', 'line', 'square', 'pill'].map(style => (
                                        <button
                                            key={style}
                                            onClick={() => handleStyleChange('dotStyle', style)}
                                            className={`px-2 py-1.5 text-xs font-semibold rounded-sm transition-colors capitalize ${(s.dotStyle || 'circle') === style
                                                ? 'bg-q-accent text-q-bg'
                                                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                                }`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ken Burns Intensity (only for kenburns variant) */}
                {currentVariant === 'kenburns' && (
                    <>
                        <hr className="border-q-border/50" />
                        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border animate-fade-in-up">
                            <h4 className="font-semibold text-q-text mb-3">Ken Burns Effect</h4>
                            <Label>Zoom Intensity</Label>
                            <div className="grid grid-cols-3 gap-2 bg-q-bg p-1 rounded-md border border-q-border">
                                {['low', 'medium', 'high'].map(intensity => (
                                    <button
                                        key={intensity}
                                        onClick={() => handleStyleChange('kenBurnsIntensity', intensity)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors capitalize ${(s.kenBurnsIntensity || 'medium') === intensity
                                            ? 'bg-q-accent text-q-bg'
                                            : 'text-q-text-secondary hover:bg-q-surface-overlay'
                                            }`}
                                    >
                                        {intensity}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Thumbnail Size (only for thumbnails variant) */}
                {currentVariant === 'thumbnails' && (
                    <>
                        <hr className="border-q-border/50" />
                        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border animate-fade-in-up">
                            <h4 className="font-semibold text-q-text mb-3">Thumbnail Settings</h4>
                            <div className="flex justify-between items-center">
                                <Label>Thumbnail Size</Label>
                                <span className="text-sm font-medium text-q-text">{s.thumbnailSize || 80}px</span>
                            </div>
                            <input
                                type="range" min="50" max="150" step="10"
                                value={s.thumbnailSize || 80}
                                onChange={e => handleStyleChange('thumbnailSize', parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-q-surface-overlay rounded-lg appearance-none cursor-pointer accent-editor-accent"
                            />
                        </div>
                    </>
                )}

                <hr className="border-q-border/50" />

                {/* --- STYLING --- */}
                <h4 className="font-semibold text-q-text">Layout & Spacing</h4>
                <div className="grid grid-cols-2 gap-4">
                    <PaddingControl label="Vertical Padding" value={s.paddingY || 'md'} onChange={v => handleStyleChange('paddingY', v)} />
                    <PaddingControl label="Horizontal Padding" value={s.paddingX || 'md'} onChange={v => handleStyleChange('paddingX', v)} />
                </div>

                {!s.fullWidth && (
                    <BorderRadiusControl
                        label="Border Radius"
                        value={s.borderRadius || 'xl'}
                        onChange={(v) => handleStyleChange('borderRadius', v)}
                    />
                )}

                <hr className="border-q-border/50" />

                {/* --- COLORS --- */}
                <h4 className="font-semibold text-q-text">Colors</h4>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Background" value={colors?.background || '#1e293b'} onChange={v => handleColorChange('background', v)} />
                    <ColorControl label="Heading" value={colors?.heading || '#F9FAFB'} onChange={v => handleColorChange('heading', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Arrow Background" value={colors?.arrowBackground || 'rgba(0, 0, 0, 0.5)'} onChange={v => handleColorChange('arrowBackground', v)} />
                    <ColorControl label="Arrow Text" value={colors?.arrowText || '#ffffff'} onChange={v => handleColorChange('arrowText', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ColorControl label="Dot Active" value={colors?.dotActive || '#ffffff'} onChange={v => handleColorChange('dotActive', v)} />
                    <ColorControl label="Dot Inactive" value={colors?.dotInactive || 'rgba(255, 255, 255, 0.5)'} onChange={v => handleColorChange('dotInactive', v)} />
                </div>

                {s.showCaptions && (
                    <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                        <ColorControl label="Caption Background" value={colors?.captionBackground || 'rgba(0, 0, 0, 0.7)'} onChange={v => handleColorChange('captionBackground', v)} />
                        <ColorControl label="Caption Text" value={colors?.captionText || '#ffffff'} onChange={v => handleColorChange('captionText', v)} />
                    </div>
                )}

                <hr className="border-q-border/50" />

                {/* --- TYPOGRAPHY --- */}
                <div className="flex items-center space-x-2">
                    <Type size={16} className="text-q-accent" />
                    <h4 className="font-semibold text-q-text">Typography</h4>
                </div>
                <FontSizeControl label="Title Size" value={s.titleFontSize || 'md'} onChange={v => handleStyleChange('titleFontSize', v)} />
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
            case 'map': return renderMapControls();
            case 'team': return renderTeamControls();
            case 'testimonials': return renderTestimonialsControls();
            case 'faq': return renderFaqControls();
            case 'chatbot': return renderChatbotControls();
            case 'colors': return renderColorsControls();
            case 'typography': return renderTypographyControls();
            case 'slideshow': return renderSlideshowControls();
            case 'screenshotCarousel': return renderSlideshowControls(); // Reuse slideshow controls for screenshot carousel
            case 'newsletter':
                return renderNewsletterControls();
            case 'howItWorks':
                return renderHowItWorksControls();
            // Standard handlers for all other components that share similar structure
            case 'pricing':
            case 'portfolio':
            case 'leads':
            case 'realEstateListings':
            case 'video':
            case 'banner':
            case 'heroSplit':
                return renderStandardControls();
            case 'footer':
                return renderFooterControls();
            default: return <p className="text-q-text-secondary">No specific styles to edit for this component yet.</p>;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="border-b border-q-border flex-shrink-0">
                <div className="px-4">
                    <nav className="-mb-px flex space-x-6">
                        <button
                            onClick={() => setActiveTab('styles')}
                            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'styles'
                                ? 'border-q-accent text-q-accent'
                                : 'border-transparent text-q-text-secondary hover:text-q-text'
                                }`}
                        >
                            Styles
                        </button>
                        <button
                            onClick={() => setActiveTab('responsive')}
                            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'responsive'
                                ? 'border-q-accent text-q-accent'
                                : 'border-transparent text-q-text-secondary hover:text-q-text'
                                }`}
                        >
                            Responsive
                        </button>
                        <button
                            onClick={() => setActiveTab('animation')}
                            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${activeTab === 'animation'
                                ? 'border-q-accent text-q-accent'
                                : 'border-transparent text-q-text-secondary hover:text-q-text'
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
