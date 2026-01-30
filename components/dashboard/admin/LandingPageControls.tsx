/**
 * LandingPageControls
 * Section-specific controls for the Landing Page Editor
 * Each section type has its own control panel with editable properties
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Type, Image, Palette, AlignLeft, AlignCenter, AlignRight,
    Eye, EyeOff, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
    Sparkles, Link2, Upload, Bold, Italic, Underline, List,
    LayoutGrid, Columns, Rows, Clock, Play, Pause, Settings, ImageIcon,
    RotateCcw, Info, Loader2, Grid, Check
} from 'lucide-react';
import ImagePicker from '../../ui/ImagePicker';
import ImagePickerModal from '../../ui/ImagePickerModal';
import ImageGeneratorModal from '../../ui/ImageGeneratorModal';
import ColorControl from '../../ui/ColorControl';
import CoolorsImporter from '../../ui/CoolorsImporter';
import { GlobalColors } from '../../../types';
import { colorPalettes, getDefaultGlobalColors } from '../../../data/colorPalettes';

// Types for landing page sections
interface LandingSection {
    id: string;
    type: string;
    enabled: boolean;
    order: number;
    data: Record<string, any>;
}

interface LandingPageControlsProps {
    section: LandingSection;
    onUpdateSection: (sectionId: string, data: Record<string, any>) => void;
    onRefreshPreview: () => void;
    // Props para colores globales
    allSections?: LandingSection[];
    onApplyGlobalColors?: (colors: GlobalColors) => void;
}

// Reusable control components
const ControlGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
        {children}
    </div>
);

const TextInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    multiline?: boolean;
}> = ({ value, onChange, placeholder, multiline }) => {
    const handleChange = (newValue: string) => {
        // #region agent log
        console.error('[DEBUG] TextInput onChange:', { oldValue: value, newValue, placeholder });
        fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPageControls.tsx:TextInput',message:'Input onChange fired',data:{oldValue:value,newValue,placeholder},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        onChange(newValue);
    };
    if (multiline) {
        return (
            <textarea
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
        );
    }
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
    );
};

const Toggle: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${checked ? 'bg-primary' : 'bg-muted-foreground/30'} relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background`}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

// ColorPicker ahora se usa el componente ColorControl de ui/ColorControl.tsx
// que provee paletas, colores recientes, opacidad, etc.

const SelectControl: React.FC<{
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const RangeControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{label}</span>
            <span className="text-xs font-mono text-muted-foreground">{value}{unit}</span>
        </div>
        <input
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-primary"
        />
    </div>
);

// ============================================================================
// SECTION CONTROLS
// ============================================================================

const LandingPageControls: React.FC<LandingPageControlsProps> = ({
    section,
    onUpdateSection,
    onRefreshPreview,
    allSections,
    onApplyGlobalColors
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');

    // Image modal states
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
    const [imageTargetField, setImageTargetField] = useState<string>('heroImage');
    const [imageTargetIndex, setImageTargetIndex] = useState<number | null>(null);

    // Global styles states - for Coolors and palette management
    const [showCoolorsImporter, setShowCoolorsImporter] = useState(false);
    const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
    const [isApplyingPalette, setIsApplyingPalette] = useState(false);
    const [globalColors, setGlobalColors] = useState<GlobalColors | null>(null);

    // Get section data with defaults
    const data = section.data || {};

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPageControls.tsx:render',message:'Component render',data:{sectionId:section.id,sectionType:section.type,dataKeys:Object.keys(data),logoText:data.logoText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
    // #endregion

    // Update handler - use the ACTUAL section.id from props (not a mapped ID)
    // This ensures we update the correct section in the state
    const updateData = (key: string, value: any) => {
        // #region agent log
        const isOnUpdateSectionDefined = typeof onUpdateSection === 'function';
        console.error('[DEBUG] updateData called:', { sectionId: section.id, key, value, isOnUpdateSectionDefined });
        fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPageControls.tsx:updateData',message:'updateData called',data:{sectionId:section.id,sectionType:section.type,key,value,currentDataKeys:Object.keys(data),isOnUpdateSectionDefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'FIX2'})}).catch(()=>{});
        // #endregion
        const newData = { ...data, [key]: value };
        // #region agent log
        console.error('[DEBUG] About to call onUpdateSection:', { sectionId: section.id, newDataKeys: Object.keys(newData) });
        fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPageControls.tsx:updateData:beforeCall',message:'About to call onUpdateSection',data:{sectionId:section.id,newDataKeys:Object.keys(newData),newData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'FIX2'})}).catch(()=>{});
        // #endregion
        try {
            // Use the ACTUAL section ID from props - this is the ID in the state array
            onUpdateSection(section.id, newData);
            // #region agent log
            console.error('[DEBUG] onUpdateSection returned successfully');
            fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPageControls.tsx:updateData:afterCall',message:'onUpdateSection completed',data:{usedId:section.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'FIX2'})}).catch(()=>{});
            // #endregion
        } catch (error: any) {
            // #region agent log
            console.error('[DEBUG] onUpdateSection threw error:', error?.message || error);
            fetch('http://127.0.0.1:7243/ingest/9b551d4e-1f47-4487-b2ea-b09bf6698241',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LandingPageControls.tsx:updateData:error',message:'onUpdateSection error',data:{error:error?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'FIX2'})}).catch(()=>{});
            // #endregion
        }
    };

    // Tab buttons
    const TabButton: React.FC<{ tab: 'content' | 'style'; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
        >
            {label}
        </button>
    );

    // Render controls based on section type
    const renderControls = () => {
        switch (section.type) {
            case 'hero':
            case 'heroModern':
            case 'heroGradient':
                return renderHeroControls();
            case 'features':
                return renderFeaturesControls();
            case 'pricing':
                return renderPricingControls();
            case 'testimonials':
                return renderTestimonialsControls();
            case 'faq':
                return renderFaqControls();
            case 'cta':
                return renderCtaControls();
            case 'footer':
                return renderFooterControls();
            case 'header':
                return renderHeaderControls();
            case 'screenshotCarousel':
                return renderCarouselControls();
            case 'globalStyles':
            case 'colors':
                return renderGlobalStylesControls();
            case 'typography':
                return renderTypographyControls();
            default:
                return renderGenericControls();
        }
    };

    // ========================================================================
    // HERO CONTROLS
    // ========================================================================
    // Helper to get active palette colors
    const getSelectedPaletteColors = () => {
        // 1. Try to find 'colors' section data from allSections prop
        if (allSections) {
            const colorsSection = allSections.find(s => s.type === 'colors');
            if (colorsSection && colorsSection.data) {
                // If we found the global colors section, return its colors
                // We construct an array from the main theme colors
                const { backgroundColor, textColor, accentColor, secondaryColor, mainColor } = colorsSection.data;
                const palette = [
                    backgroundColor,
                    textColor,
                    accentColor,
                    secondaryColor || '#3b82f6', // fallback defaults matching standard palette
                    mainColor || '#3b82f6'
                ].filter(Boolean); // Filter out undefined/null

                if (palette.length > 0) return palette;
            }
        }

        // 2. Fallback to default palette if no global section found
        return ['#000000', '#ffffff', '#facc15', '#3b82f6', '#10b981'];
    };

    const renderHeroControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.heroTitle', 'Título Principal')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Crea tu Sitio Web con IA"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.heroSubtitle', 'Subtítulo')}>
                        <TextInput
                            value={data.subtitle || ''}
                            onChange={(v) => updateData('subtitle', v)}
                            placeholder="Ej: La forma más rápida de crear sitios web profesionales"
                            multiline
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.primaryButton', 'Botón Principal')}>
                        <TextInput
                            value={data.primaryButtonText || ''}
                            onChange={(v) => updateData('primaryButtonText', v)}
                            placeholder="Ej: Comenzar Gratis"
                        />
                        <TextInput
                            value={data.primaryButtonLink || ''}
                            onChange={(v) => updateData('primaryButtonLink', v)}
                            placeholder="/register"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.secondaryButton', 'Botón Secundario')}>
                        <Toggle
                            label={t('landingEditor.showSecondaryButton', 'Mostrar')}
                            checked={data.showSecondaryButton ?? true}
                            onChange={(v) => updateData('showSecondaryButton', v)}
                        />
                        {data.showSecondaryButton !== false && (
                            <>
                                <TextInput
                                    value={data.secondaryButtonText || ''}
                                    onChange={(v) => updateData('secondaryButtonText', v)}
                                    placeholder="Ej: Ver Demo"
                                />
                            </>
                        )}
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.heroImage', 'Imagen')}>
                        <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="relative w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0 border border-border">
                                    {data.heroImage ? (
                                        <img src={data.heroImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon size={12} /></div>
                                    )}
                                </div>

                                <div className="flex gap-1">
                                    <button
                                        onClick={() => { setImageTargetField('heroImage'); setIsImagePickerOpen(true); }}
                                        className="shrink-0 p-2 rounded-lg bg-muted hover:bg-muted-foreground/20 transition-colors"
                                        title={t('landingEditor.selectFromLibrary', 'Seleccionar de librería')}
                                    >
                                        <Image size={16} />
                                    </button>
                                    <button
                                        onClick={() => { setImageTargetField('heroImage'); setIsAIGeneratorOpen(true); }}
                                        className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        title={t('landingEditor.generateWithAI', 'Generar con IA')}
                                    >
                                        <Sparkles size={16} />
                                    </button>
                                    {data.heroImage && (
                                        <button
                                            onClick={() => updateData('heroImage', '')}
                                            className="p-2 text-destructive hover:bg-destructive/10 rounded"
                                            title={t('landingEditor.removeImage', 'Eliminar imagen')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                            {t('landingEditor.layout', 'DISEÑO Y ESTRUCTURA')}
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { id: 'centered', icon: AlignCenter, label: 'Centrado' },
                                { id: 'left', icon: AlignLeft, label: 'Izquierda' },
                                { id: 'right', icon: AlignRight, label: 'Derecha' },
                                { id: 'split', icon: Columns, label: 'Dividido' }
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => updateData('layout', option.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${data.layout === option.id
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-card border-border hover:border-primary/50 text-muted-foreground'
                                        }`}
                                    title={option.label}
                                >
                                    <option.icon size={20} className="mb-1" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <ColorControl
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#000000'}
                        onChange={(v) => updateData('backgroundColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.textColor', 'Texto')}
                        value={data.textColor || '#ffffff'}
                        onChange={(v) => updateData('textColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <RangeControl
                        label={t('landingEditor.padding', 'Espaciado')}
                        value={data.padding || 80}
                        min={20}
                        max={200}
                        unit="px"
                        onChange={(v) => updateData('padding', v)}
                    />

                    <div className="border-t border-border pt-4">
                        <Toggle
                            label={t('landingEditor.gradient', 'Mostrar Gradiente')}
                            checked={data.showGradient || false}
                            onChange={(v) => updateData('showGradient', v)}
                        />
                        {data.showGradient && (
                            <div className="mt-4 space-y-4 pl-4 border-l-2 border-primary/20">
                                <SelectControl
                                    label="Dirección"
                                    value={data.gradientDirection || 'to bottom'}
                                    options={[
                                        { value: 'to bottom', label: 'Vertical ↓' },
                                        { value: 'to right', label: 'Horizontal →' },
                                        { value: 'to bottom right', label: 'Diagonal ↘' },
                                        { value: 'radial', label: 'Radial O' },
                                    ]}
                                    onChange={(v) => updateData('gradientDirection', v)}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <ColorControl
                                        label="Inicio"
                                        value={data.gradientStart || '#000000'}
                                        onChange={(v) => updateData('gradientStart', v)}
                                        paletteColors={getSelectedPaletteColors()}
                                    />
                                    <ColorControl
                                        label="Fin"
                                        value={data.gradientEnd || 'transparent'}
                                        onChange={(v) => updateData('gradientEnd', v)}
                                        paletteColors={getSelectedPaletteColors()}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-border pt-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                            {t('landingEditor.overlay', 'SUPERPOSICIÓN (OVERLAY)')}
                        </label>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Opacidad</span>
                                    <span className="font-mono">{((data.overlayOpacity ?? 0) * 100).toFixed(0)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={data.overlayOpacity ?? 0}
                                    onChange={(e) => updateData('overlayOpacity', parseFloat(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                            <ColorControl
                                label="Color de Fondo"
                                value={data.overlayColor || '#000000'}
                                onChange={(v) => updateData('overlayColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    // ========================================================================
    // FEATURES CONTROLS
    // ========================================================================
    const renderFeaturesControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Características"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.sectionSubtitle', 'Descripción')}>
                        <TextInput
                            value={data.subtitle || ''}
                            onChange={(v) => updateData('subtitle', v)}
                            placeholder="Ej: Todo lo que necesitas para tener éxito"
                            multiline
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.features', 'Características')}>
                        <div className="space-y-3 mt-2">
                            {(data.features || []).map((feature: any, idx: number) => (
                                <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                                        <button
                                            onClick={() => {
                                                const newFeatures = [...(data.features || [])];
                                                newFeatures.splice(idx, 1);
                                                updateData('features', newFeatures);
                                            }}
                                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <TextInput
                                        value={feature.title || ''}
                                        onChange={(v) => {
                                            const newFeatures = [...(data.features || [])];
                                            newFeatures[idx] = { ...newFeatures[idx], title: v };
                                            updateData('features', newFeatures);
                                        }}
                                        placeholder="Título"
                                    />
                                    <TextInput
                                        value={feature.description || ''}
                                        onChange={(v) => {
                                            const newFeatures = [...(data.features || [])];
                                            newFeatures[idx] = { ...newFeatures[idx], description: v };
                                            updateData('features', newFeatures);
                                        }}
                                        placeholder="Descripción"
                                        multiline
                                    />
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newFeatures = [...(data.features || []), { title: '', description: '', icon: 'Star' }];
                                    updateData('features', newFeatures);
                                }}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('landingEditor.addFeature', 'Añadir característica')}
                            </button>
                        </div>
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <SelectControl
                        label={t('landingEditor.columns', 'Columnas')}
                        value={String(data.columns || 3)}
                        options={[
                            { value: '2', label: '2 columnas' },
                            { value: '3', label: '3 columnas' },
                            { value: '4', label: '4 columnas' },
                        ]}
                        onChange={(v) => updateData('columns', Number(v))}
                    />

                    <ColorControl
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#0A0A0A'}
                        onChange={(v) => updateData('backgroundColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.textColor', 'Texto')}
                        value={data.textColor || '#ffffff'}
                        onChange={(v) => updateData('textColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.accentColor', 'Color de acento')}
                        value={data.accentColor || '#facc15'}
                        onChange={(v) => updateData('accentColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <RangeControl
                        label={t('landingEditor.padding', 'Espaciado')}
                        value={data.padding || 80}
                        min={20}
                        max={200}
                        unit="px"
                        onChange={(v) => updateData('padding', v)}
                    />

                    <Toggle
                        label={t('landingEditor.showIcons', 'Mostrar iconos')}
                        checked={data.showIcons ?? true}
                        onChange={(v) => updateData('showIcons', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // PRICING CONTROLS
    // ========================================================================
    const renderPricingControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Planes y Precios"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.sectionSubtitle', 'Descripción')}>
                        <TextInput
                            value={data.subtitle || ''}
                            onChange={(v) => updateData('subtitle', v)}
                            placeholder="Ej: Elige el plan perfecto para ti"
                            multiline
                        />
                    </ControlGroup>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">
                            {t('landingEditor.pricingNote', 'Los planes de precios se gestionan desde el panel de Suscripciones.')}
                        </p>
                    </div>

                    <Toggle
                        label={t('landingEditor.showMonthlyToggle', 'Mostrar toggle mensual/anual')}
                        checked={data.showBillingToggle ?? true}
                        onChange={(v) => updateData('showBillingToggle', v)}
                    />

                    <Toggle
                        label={t('landingEditor.highlightPopular', 'Destacar plan popular')}
                        checked={data.highlightPopular ?? true}
                        onChange={(v) => updateData('highlightPopular', v)}
                    />
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <ColorControl
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#0A0A0A'}
                        onChange={(v) => updateData('backgroundColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.textColor', 'Texto')}
                        value={data.textColor || '#ffffff'}
                        onChange={(v) => updateData('textColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.accentColor', 'Color de acento')}
                        value={data.accentColor || '#facc15'}
                        onChange={(v) => updateData('accentColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <RangeControl
                        label={t('landingEditor.padding', 'Espaciado')}
                        value={data.padding || 80}
                        min={20}
                        max={200}
                        unit="px"
                        onChange={(v) => updateData('padding', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // TESTIMONIALS CONTROLS
    // ========================================================================
    const renderTestimonialsControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Lo que dicen nuestros clientes"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.testimonials', 'Testimonios')}>
                        <div className="space-y-3 mt-2">
                            {(data.testimonials || []).map((testimonial: any, idx: number) => (
                                <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">Testimonio #{idx + 1}</span>
                                        <button
                                            onClick={() => {
                                                const newTestimonials = [...(data.testimonials || [])];
                                                newTestimonials.splice(idx, 1);
                                                updateData('testimonials', newTestimonials);
                                            }}
                                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <TextInput
                                        value={testimonial.name || ''}
                                        onChange={(v) => {
                                            const newTestimonials = [...(data.testimonials || [])];
                                            newTestimonials[idx] = { ...newTestimonials[idx], name: v };
                                            updateData('testimonials', newTestimonials);
                                        }}
                                        placeholder="Nombre"
                                    />
                                    <TextInput
                                        value={testimonial.role || ''}
                                        onChange={(v) => {
                                            const newTestimonials = [...(data.testimonials || [])];
                                            newTestimonials[idx] = { ...newTestimonials[idx], role: v };
                                            updateData('testimonials', newTestimonials);
                                        }}
                                        placeholder="Cargo / Empresa"
                                    />
                                    <TextInput
                                        value={testimonial.text || ''}
                                        onChange={(v) => {
                                            const newTestimonials = [...(data.testimonials || [])];
                                            newTestimonials[idx] = { ...newTestimonials[idx], text: v };
                                            updateData('testimonials', newTestimonials);
                                        }}
                                        placeholder="Testimonio"
                                        multiline
                                    />
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newTestimonials = [...(data.testimonials || []), { name: '', role: '', text: '' }];
                                    updateData('testimonials', newTestimonials);
                                }}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('landingEditor.addTestimonial', 'Añadir testimonio')}
                            </button>
                        </div>
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <ColorControl
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#050505'}
                        onChange={(v) => updateData('backgroundColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.textColor', 'Texto')}
                        value={data.textColor || '#ffffff'}
                        onChange={(v) => updateData('textColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.accentColor', 'Color de acento')}
                        value={data.accentColor || '#facc15'}
                        onChange={(v) => updateData('accentColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <RangeControl
                        label={t('landingEditor.padding', 'Espaciado')}
                        value={data.padding || 80}
                        min={20}
                        max={200}
                        unit="px"
                        onChange={(v) => updateData('padding', v)}
                    />

                    <SelectControl
                        label={t('landingEditor.layout', 'Layout')}
                        value={data.layout || 'grid'}
                        options={[
                            { value: 'grid', label: 'Grid' },
                            { value: 'carousel', label: 'Carrusel' },
                            { value: 'masonry', label: 'Masonry' },
                        ]}
                        onChange={(v) => updateData('layout', v)}
                    />

                    <Toggle
                        label={t('landingEditor.autoPlay', 'Auto-reproducir (carrusel)')}
                        checked={data.autoPlay ?? true}
                        onChange={(v) => updateData('autoPlay', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // FAQ CONTROLS
    // ========================================================================
    const renderFaqControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Preguntas Frecuentes"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.faqs', 'Preguntas')}>
                        <div className="space-y-3 mt-2">
                            {(data.faqs || []).map((faq: any, idx: number) => (
                                <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                                        <button
                                            onClick={() => {
                                                const newFaqs = [...(data.faqs || [])];
                                                newFaqs.splice(idx, 1);
                                                updateData('faqs', newFaqs);
                                            }}
                                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <TextInput
                                        value={faq.question || ''}
                                        onChange={(v) => {
                                            const newFaqs = [...(data.faqs || [])];
                                            newFaqs[idx] = { ...newFaqs[idx], question: v };
                                            updateData('faqs', newFaqs);
                                        }}
                                        placeholder="Pregunta"
                                    />
                                    <TextInput
                                        value={faq.answer || ''}
                                        onChange={(v) => {
                                            const newFaqs = [...(data.faqs || [])];
                                            newFaqs[idx] = { ...newFaqs[idx], answer: v };
                                            updateData('faqs', newFaqs);
                                        }}
                                        placeholder="Respuesta"
                                        multiline
                                    />
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newFaqs = [...(data.faqs || []), { question: '', answer: '' }];
                                    updateData('faqs', newFaqs);
                                }}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('landingEditor.addFaq', 'Añadir pregunta')}
                            </button>
                        </div>
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <ColorControl
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#0A0A0A'}
                        onChange={(v) => updateData('backgroundColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.textColor', 'Texto')}
                        value={data.textColor || '#ffffff'}
                        onChange={(v) => updateData('textColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.accentColor', 'Color de acento')}
                        value={data.accentColor || '#facc15'}
                        onChange={(v) => updateData('accentColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <RangeControl
                        label={t('landingEditor.padding', 'Espaciado')}
                        value={data.padding || 80}
                        min={20}
                        max={200}
                        unit="px"
                        onChange={(v) => updateData('padding', v)}
                    />

                    <SelectControl
                        label={t('landingEditor.faqStyle', 'Estilo')}
                        value={data.style || 'accordion'}
                        options={[
                            { value: 'accordion', label: 'Acordeón' },
                            { value: 'list', label: 'Lista' },
                            { value: 'cards', label: 'Tarjetas' },
                        ]}
                        onChange={(v) => updateData('style', v)}
                    />

                    <Toggle
                        label={t('landingEditor.allowMultipleOpen', 'Permitir múltiples abiertas')}
                        checked={data.allowMultipleOpen ?? false}
                        onChange={(v) => updateData('allowMultipleOpen', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // CTA CONTROLS
    // ========================================================================
    const renderCtaControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.ctaTitle', 'Título')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: ¿Listo para empezar?"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.ctaSubtitle', 'Subtítulo')}>
                        <TextInput
                            value={data.subtitle || ''}
                            onChange={(v) => updateData('subtitle', v)}
                            placeholder="Ej: Crea tu sitio web en minutos"
                            multiline
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.ctaButton', 'Botón')}>
                        <TextInput
                            value={data.buttonText || ''}
                            onChange={(v) => updateData('buttonText', v)}
                            placeholder="Ej: Comenzar Ahora"
                        />
                        <TextInput
                            value={data.buttonLink || ''}
                            onChange={(v) => updateData('buttonLink', v)}
                            placeholder="/register"
                        />
                    </ControlGroup>
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <ColorControl
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#7c3aed'}
                        onChange={(v) => updateData('backgroundColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <ColorControl
                        label={t('landingEditor.textColor', 'Texto')}
                        value={data.textColor || '#ffffff'}
                        onChange={(v) => updateData('textColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <Toggle
                        label={t('landingEditor.showPattern', 'Mostrar patrón de fondo')}
                        checked={data.showPattern ?? false}
                        onChange={(v) => updateData('showPattern', v)}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // FOOTER CONTROLS
    // ========================================================================
    const renderFooterControls = () => (
        <div className="space-y-6">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.companyName', 'Nombre de Empresa')}>
                        <TextInput
                            value={data.companyName || ''}
                            onChange={(v) => updateData('companyName', v)}
                            placeholder="Ej: Quimera.ai"
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.tagline', 'Tagline')}>
                        <TextInput
                            value={data.tagline || ''}
                            onChange={(v) => updateData('tagline', v)}
                            placeholder="Ej: La mejor plataforma de creación de sitios web con IA"
                            multiline
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.copyrightText', 'Texto de Copyright')}>
                        <TextInput
                            value={data.copyright || ''}
                            onChange={(v) => updateData('copyright', v)}
                            placeholder="© 2024 Quimera.ai. Todos los derechos reservados."
                        />
                    </ControlGroup>

                    <Toggle
                        label={t('landingEditor.showSocialLinks', 'Mostrar redes sociales')}
                        checked={data.showSocialLinks ?? true}
                        onChange={(v) => updateData('showSocialLinks', v)}
                    />

                    <Toggle
                        label={t('landingEditor.showLegalLinks', 'Mostrar enlaces legales')}
                        checked={data.showLegalLinks ?? true}
                        onChange={(v) => updateData('showLegalLinks', v)}
                    />
                </>
            )}

            {activeTab === 'style' && (
                <>
                    <ColorControl
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#111827'}
                        onChange={(v) => updateData('backgroundColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />

                    <SelectControl
                        label={t('landingEditor.columns', 'Columnas')}
                        value={String(data.columns || 4)}
                        options={[
                            { value: '2', label: '2 columnas' },
                            { value: '3', label: '3 columnas' },
                            { value: '4', label: '4 columnas' },
                        ]}
                        onChange={(v) => updateData('columns', Number(v))}
                    />
                </>
            )}
        </div>
    );

    // ========================================================================
    // HEADER CONTROLS
    // ========================================================================
    const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);

    const renderHeaderControls = () => (
        <div className="space-y-6">
            {/* Content controls - always show for header since tabs are hidden */}
            <ControlGroup label={t('landingEditor.logoImage', 'Logo')}>
                {/* Logo Preview & Picker */}
                <div className="space-y-3">
                    {data.logoImage && (
                        <div className="relative w-full h-20 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
                            <img
                                src={data.logoImage}
                                alt="Logo"
                                className="max-h-full max-w-full object-contain"
                            />
                            <button
                                onClick={() => updateData('logoImage', '')}
                                className="absolute top-1 right-1 p-1 rounded bg-destructive/80 text-white hover:bg-destructive"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setIsLogoPickerOpen(true)}
                        className="w-full py-3 px-4 rounded-lg border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                    >
                        <Image size={18} />
                        {data.logoImage
                            ? t('landingEditor.changeLogo', 'Cambiar Logo')
                            : t('landingEditor.selectLogo', 'Seleccionar Logo de Biblioteca')
                        }
                    </button>
                </div>
            </ControlGroup>

            <ControlGroup label={t('landingEditor.logoText', 'Texto del Logo')}>
                <TextInput
                    value={data.logoText || ''}
                    onChange={(v) => updateData('logoText', v)}
                    placeholder="Ej: Quimera.ai"
                />
            </ControlGroup>

            <ControlGroup label={t('landingEditor.ctaButtons', 'Botones CTA')}>
                <Toggle
                    label={t('landingEditor.showLoginButton', 'Mostrar botón de login')}
                    checked={data.showLoginButton ?? true}
                    onChange={(v) => updateData('showLoginButton', v)}
                />
                <Toggle
                    label={t('landingEditor.showRegisterButton', 'Mostrar botón de registro')}
                    checked={data.showRegisterButton ?? true}
                    onChange={(v) => updateData('showRegisterButton', v)}
                />
            </ControlGroup>

            <ControlGroup label={t('landingEditor.ctaButtonTexts', 'Textos de Botones')}>
                <TextInput
                    value={data.loginText || ''}
                    onChange={(v) => updateData('loginText', v)}
                    placeholder="Login"
                />
                <TextInput
                    value={data.registerText || ''}
                    onChange={(v) => updateData('registerText', v)}
                    placeholder="Comenzar Gratis"
                />
            </ControlGroup>

            {/* Style controls - included inline since tabs are hidden */}
            <div className="border-t border-border pt-4 mt-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    {t('landingEditor.style', 'ESTILO')}
                </label>
                <div className="space-y-4">
                    <Toggle
                        label={t('landingEditor.stickyHeader', 'Header fijo')}
                        checked={data.sticky ?? true}
                        onChange={(v) => updateData('sticky', v)}
                    />

                    <Toggle
                        label={t('landingEditor.transparentHeader', 'Header transparente')}
                        checked={data.transparent ?? false}
                        onChange={(v) => updateData('transparent', v)}
                    />

                    <ColorControl
                        label={t('landingEditor.backgroundColor', 'Fondo')}
                        value={data.backgroundColor || '#000000'}
                        onChange={(v) => updateData('backgroundColor', v)}
                        paletteColors={getSelectedPaletteColors()}
                    />
                </div>
            </div>

            {/* Logo Picker Modal */}
            <ImagePickerModal
                isOpen={isLogoPickerOpen}
                onClose={() => setIsLogoPickerOpen(false)}
                onSelect={(url) => updateData('logoImage', url)}
                title={t('landingEditor.selectLogo', 'Seleccionar Logo')}
            />
        </div>
    );

    // ========================================================================
    // IMAGE CAROUSEL CONTROLS
    // ========================================================================
    const renderCarouselControls = () => {
        // Ensure images is array of objects for new functionality
        // Migration: string[] -> { url: string }[]
        const images = Array.isArray(data.images)
            ? data.images.map((img: any) => typeof img === 'string' ? { url: img, title: '', subtitle: '' } : img)
            : [];

        const updateImages = (newImages: any[]) => {
            updateData('images', newImages);
        };

        return (
            <div className="space-y-6">
                {activeTab === 'content' && (
                    <>
                        <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                            <TextInput
                                value={data.title || ''}
                                onChange={(v) => updateData('title', v)}
                                placeholder="Ej: Nuestra Galería"
                            />
                        </ControlGroup>

                        <ControlGroup label={t('landingEditor.sectionSubtitle', 'Descripción')}>
                            <TextInput
                                value={data.subtitle || ''}
                                onChange={(v) => updateData('subtitle', v)}
                                placeholder="Ej: Un vistazo a nuestros proyectos"
                                multiline
                            />
                        </ControlGroup>

                        <SelectControl
                            label={t('landingEditor.carouselMode', 'Modo de Visualización')}
                            value={data.variant || 'basic'}
                            options={[
                                { value: 'basic', label: 'Básico (Solo Imágenes)' },
                                { value: 'gradient', label: 'Gradiente con Texto' },
                                { value: 'cards', label: 'Tarjetas Modernas' },
                                { value: 'modern', label: 'Coverflow 3D' },
                            ]}
                            onChange={(v) => updateData('variant', v)}
                        />

                        <ControlGroup label={t('landingEditor.carouselImages', 'Imágenes')}>
                            <div className="space-y-3 mt-2">
                                {images.map((image: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="relative w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0 border border-border">
                                                {image.url ? (
                                                    <img src={image.url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Image size={12} /></div>
                                                )}
                                            </div>

                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => { setImageTargetField('carouselImage'); setImageTargetIndex(idx); setIsImagePickerOpen(true); }}
                                                    className="shrink-0 p-2 rounded-lg bg-muted hover:bg-muted-foreground/20 transition-colors"
                                                    title={t('landingEditor.selectFromLibrary', 'Seleccionar de librería')}
                                                >
                                                    <Image size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setImageTargetField('carouselImage'); setImageTargetIndex(idx); setIsAIGeneratorOpen(true); }}
                                                    className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                                    title={t('landingEditor.generateWithAI', 'Generar con IA')}
                                                >
                                                    <Sparkles size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newImages = [...images];
                                                        newImages.splice(idx, 1);
                                                        updateImages(newImages);
                                                    }}
                                                    className="p-2 text-destructive hover:bg-destructive/10 rounded"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Show extra fields for non-basic modes */}
                                        {data.variant !== 'basic' && (
                                            <div className="pl-2 border-l-2 border-primary/20 space-y-2 animate-in slide-in-from-left-2 duration-200">
                                                <TextInput
                                                    value={image.title || ''}
                                                    onChange={(v) => {
                                                        const newImages = [...images];
                                                        newImages[idx] = { ...newImages[idx], title: v };
                                                        updateImages(newImages);
                                                    }}
                                                    placeholder="Título de la imagen"
                                                />
                                                <TextInput
                                                    value={image.subtitle || ''}
                                                    onChange={(v) => {
                                                        const newImages = [...images];
                                                        newImages[idx] = { ...newImages[idx], subtitle: v };
                                                        updateImages(newImages);
                                                    }}
                                                    placeholder="Descripción corta"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        updateImages([...images, { url: '', title: '', subtitle: '' }]);
                                    }}
                                    className="w-full py-2 px-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} />
                                    {t('landingEditor.addImage', 'Añadir imagen')}
                                </button>
                            </div>
                        </ControlGroup>
                    </>
                )}

                <ColorControl
                    label={t('landingEditor.backgroundColor', 'Fondo')}
                    value={data.backgroundColor || '#0A0A0A'}
                    onChange={(v) => updateData('backgroundColor', v)}
                    paletteColors={getSelectedPaletteColors()}
                />
                <ColorControl
                    label={t('landingEditor.textColor', 'Texto')}
                    value={data.textColor || '#ffffff'}
                    onChange={(v) => updateData('textColor', v)}
                    paletteColors={getSelectedPaletteColors()}
                />
                <ColorControl
                    label={t('landingEditor.accentColor', 'Color Acento')}
                    value={data.accentColor || '#facc15'}
                    onChange={(v) => updateData('accentColor', v)}
                    paletteColors={getSelectedPaletteColors()}
                />
                <RangeControl
                    label={t('landingEditor.padding', 'Espaciado')}
                    value={data.padding || 80}
                    min={20}
                    max={200}
                    unit="px"
                    onChange={(v) => updateData('padding', v)}
                />

                <Toggle
                    label={t('landingEditor.autoScroll', 'Auto-scroll')}
                    checked={data.autoScroll ?? true}
                    onChange={(v) => updateData('autoScroll', v)}
                />

                {data.autoScroll !== false && (
                    <RangeControl
                        label={t('landingEditor.scrollSpeed', 'Velocidad')}
                        value={data.scrollSpeed || 50}
                        min={10}
                        max={200}
                        unit="px/s"
                        onChange={(v) => updateData('scrollSpeed', v)}
                    />
                )}

                <SelectControl
                    label={t('landingEditor.aspectRatio', 'Aspect Ratio')}
                    value={data.aspectRatio || '16:9'}
                    options={[
                        { value: '16:9', label: '16:9 (Widescreen)' },
                        { value: '4:3', label: '4:3 (Estándar)' },
                        { value: '3:2', label: '3:2' },
                        { value: '1:1', label: '1:1 (Cuadrado)' },
                    ]}
                    onChange={(v) => updateData('aspectRatio', v)}
                />

                <Toggle
                    label={t('landingEditor.showNavigation', 'Mostrar navegación')}
                    checked={data.showNavigation ?? true}
                    onChange={(v) => updateData('showNavigation', v)}
                />

                <Toggle
                    label={t('landingEditor.showScrollbar', 'Mostrar barra de desplazamiento')}
                    checked={data.showScrollbar ?? false}
                    onChange={(v) => updateData('showScrollbar', v)}
                />
            </div>
        );
    };

    // ========================================================================
    // GLOBAL STYLES CONTROLS - Coolors & Palettes
    // ========================================================================
    const handleCoolorsPaletteGenerated = async (colors: GlobalColors, allColors: string[], _paletteName?: string) => {
        setIsApplyingPalette(true);
        try {
            setGlobalColors(colors);

            // Si hay onApplyGlobalColors, aplicar a TODAS las secciones
            if (onApplyGlobalColors) {
                onApplyGlobalColors(colors);
            } else {
                // Fallback: solo actualizar la sección actual
                updateData('backgroundColor', colors.background);
                updateData('textColor', colors.text);
                updateData('accentColor', colors.primary);
                onRefreshPreview();
            }

            setShowCoolorsImporter(false);
            setSelectedPaletteId(null);
        } finally {
            setIsApplyingPalette(false);
        }
    };

    const handlePaletteSelect = async (palette: { id: string; colors: GlobalColors }) => {
        setIsApplyingPalette(true);
        setSelectedPaletteId(palette.id);
        try {
            setGlobalColors(palette.colors);

            // Si hay onApplyGlobalColors, aplicar a TODAS las secciones
            if (onApplyGlobalColors) {
                onApplyGlobalColors(palette.colors);
            } else {
                // Fallback: solo actualizar la sección actual
                updateData('backgroundColor', palette.colors.background);
                updateData('textColor', palette.colors.text);
                updateData('accentColor', palette.colors.primary);
                onRefreshPreview();
            }
        } finally {
            setIsApplyingPalette(false);
        }
    };

    const handleResetColors = () => {
        const defaultColors = getDefaultGlobalColors();
        setGlobalColors(defaultColors);

        // Si hay onApplyGlobalColors, aplicar a TODAS las secciones
        if (onApplyGlobalColors) {
            onApplyGlobalColors(defaultColors);
        } else {
            // Fallback: solo actualizar la sección actual
            updateData('backgroundColor', defaultColors.background);
            updateData('textColor', defaultColors.text);
            updateData('accentColor', defaultColors.primary);
            onRefreshPreview();
        }
        setSelectedPaletteId(null);
    };

    /**
     * Re-aplicar colores globales a todas las secciones
     */
    const handleReapplyColors = () => {
        if (globalColors && onApplyGlobalColors) {
            setIsApplyingPalette(true);
            onApplyGlobalColors(globalColors);
            setIsApplyingPalette(false);
        }
    };

    const renderGlobalStylesControls = () => (
        <div className="space-y-6">
            {/* Coolors.co Importer Section */}
            <div className="border border-dashed border-purple-500/30 rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowCoolorsImporter(!showCoolorsImporter)}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all"
                >
                    <div className="flex items-center gap-2">
                        <Upload size={16} className="text-purple-400" />
                        <span className="text-sm font-medium text-foreground">
                            {t('landingEditor.importFromCoolors', 'Importar paleta de Coolors.co')}
                        </span>
                    </div>
                    <ChevronDown size={14} className={`text-purple-400 transition-transform ${showCoolorsImporter ? 'rotate-180' : ''}`} />
                </button>

                {showCoolorsImporter && (
                    <div className="p-4 border-t border-purple-500/20">
                        <CoolorsImporter onPaletteGenerated={handleCoolorsPaletteGenerated} />
                    </div>
                )}
            </div>

            {/* Palettes Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={14} className="text-primary" />
                        {t('landingEditor.presetPalettes', 'Paletas Predefinidas')}
                    </label>
                    <button
                        onClick={handleResetColors}
                        disabled={isApplyingPalette}
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                        <RotateCcw size={12} className={isApplyingPalette ? 'animate-spin' : ''} />
                        {t('landingEditor.reset', 'Restablecer')}
                    </button>
                </div>

                {/* Info Banner */}
                <div className="mb-3 p-2.5 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-xs text-primary flex items-start gap-2">
                        <Info size={14} className="flex-shrink-0 mt-0.5" />
                        <span>
                            {t('landingEditor.paletteInfo', 'Los colores se aplicarán a la sección actual. Puedes ajustarlos individualmente después.')}
                        </span>
                    </p>
                </div>

                {/* Palette Grid */}
                <div className="grid grid-cols-2 gap-2">
                    {colorPalettes.map((palette) => (
                        <button
                            key={palette.id}
                            onClick={() => handlePaletteSelect(palette)}
                            disabled={isApplyingPalette}
                            className={`relative p-2.5 rounded-lg border transition-all text-left group ${selectedPaletteId === palette.id
                                ? 'border-primary ring-1 ring-primary bg-primary/10'
                                : 'border-border hover:border-primary/50 bg-background hover:bg-muted/50'
                                } ${isApplyingPalette ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                        >
                            {/* Selection indicator */}
                            {selectedPaletteId === palette.id && (
                                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                    {isApplyingPalette ? (
                                        <Loader2 size={10} className="text-white animate-spin" />
                                    ) : (
                                        <Check size={10} className="text-white" />
                                    )}
                                </div>
                            )}

                            {/* Color Preview */}
                            <div className="flex gap-1 mb-2">
                                {palette.preview.map((color, idx) => (
                                    <div
                                        key={idx}
                                        className="w-5 h-5 rounded-md border border-white/10 shadow-sm"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>

                            {/* Palette Name */}
                            <p className="text-xs font-medium text-foreground truncate">
                                {palette.nameEs}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Current Colors Preview */}
            {globalColors && (
                <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                        {t('landingEditor.currentColors', 'Colores Actuales')}
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 h-8 rounded" style={{ backgroundColor: globalColors.background }} title="Background" />
                        <div className="flex-1 h-8 rounded" style={{ backgroundColor: globalColors.primary }} title="Primary" />
                        <div className="flex-1 h-8 rounded" style={{ backgroundColor: globalColors.secondary }} title="Secondary" />
                        <div className="flex-1 h-8 rounded" style={{ backgroundColor: globalColors.accent }} title="Accent" />
                    </div>
                </div>
            )}

            {/* Re-apply Colors Button */}
            {globalColors && onApplyGlobalColors && (
                <button
                    onClick={handleReapplyColors}
                    disabled={isApplyingPalette}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                >
                    {isApplyingPalette ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Sparkles size={16} />
                    )}
                    {t('landingEditor.reapplyColors', 'Re-aplicar colores a todos los componentes')}
                </button>
            )}
        </div>
    );

    // ========================================================================
    // TYPOGRAPHY CONTROLS (Global Fonts - Same as User Web Editor)
    // ========================================================================
    const FONT_OPTIONS = [
        // Sans-serif fonts
        { value: 'roboto', label: 'Roboto' },
        { value: 'open-sans', label: 'Open Sans' },
        { value: 'lato', label: 'Lato' },
        { value: 'poppins', label: 'Poppins' },
        { value: 'montserrat', label: 'Montserrat' },
        { value: 'mulish', label: 'Mulish' },
        { value: 'inter', label: 'Inter' },
        { value: 'dm-sans', label: 'DM Sans' },
        { value: 'space-grotesk', label: 'Space Grotesk' },
        { value: 'oswald', label: 'Oswald' },
        { value: 'source-sans-pro', label: 'Source Sans Pro' },
        { value: 'raleway', label: 'Raleway' },
        { value: 'pt-sans', label: 'PT Sans' },
        { value: 'ubuntu', label: 'Ubuntu' },
        { value: 'noto-sans', label: 'Noto Sans' },
        { value: 'cabin', label: 'Cabin' },
        { value: 'fira-sans', label: 'Fira Sans' },
        { value: 'josefin-sans', label: 'Josefin Sans' },
        { value: 'anton', label: 'Anton' },
        { value: 'yanone-kaffeesatz', label: 'Yanone Kaffeesatz' },
        { value: 'arimo', label: 'Arimo' },
        { value: 'abel', label: 'Abel' },
        { value: 'archivo-narrow', label: 'Archivo Narrow' },
        { value: 'francois-one', label: 'Francois One' },
        { value: 'signika', label: 'Signika' },
        { value: 'oxygen', label: 'Oxygen' },
        { value: 'quicksand', label: 'Quicksand' },
        { value: 'exo-2', label: 'Exo 2' },
        { value: 'varela-round', label: 'Varela Round' },
        { value: 'dosis', label: 'Dosis' },
        { value: 'titillium-web', label: 'Titillium Web' },
        { value: 'nobile', label: 'Nobile' },
        { value: 'asap', label: 'Asap' },
        { value: 'questrial', label: 'Questrial' },
        // Serif fonts
        { value: 'playfair-display', label: 'Playfair Display' },
        { value: 'merriweather', label: 'Merriweather' },
        { value: 'lora', label: 'Lora' },
        { value: 'slabo-27px', label: 'Slabo 27px' },
        { value: 'crimson-text', label: 'Crimson Text' },
        { value: 'arvo', label: 'Arvo' },
        { value: 'noto-serif', label: 'Noto Serif' },
        { value: 'bree-serif', label: 'Bree Serif' },
        { value: 'vollkorn', label: 'Vollkorn' },
        { value: 'pt-serif', label: 'PT Serif' },
        { value: 'bitter', label: 'Bitter' },
        { value: 'noticia-text', label: 'Noticia Text' },
        { value: 'cardo', label: 'Cardo' },
        // Decorative/Display fonts
        { value: 'indie-flower', label: 'Indie Flower' },
        { value: 'pacifico', label: 'Pacifico' },
        { value: 'lobster', label: 'Lobster' },
        { value: 'dancing-script', label: 'Dancing Script' },
        { value: 'amatic-sc', label: 'Amatic SC' },
        // Monospace
        { value: 'inconsolata', label: 'Inconsolata' },
    ];

    const renderTypographyControls = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2 text-primary mb-2">
                <Type size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">
                    {t('landingEditor.globalFonts', 'FUENTES GLOBALES')}
                </span>
            </div>

            {/* Heading Font */}
            <ControlGroup label={t('landingEditor.headingFont', 'Fuente de Encabezados')}>
                <select
                    value={data.headingFont || 'Open Sans'}
                    onChange={(e) => updateData('headingFont', e.target.value)}
                    className="w-full py-2.5 px-3 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    {FONT_OPTIONS.map(font => (
                        <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                </select>
            </ControlGroup>

            {/* Body Font */}
            <ControlGroup label={t('landingEditor.bodyFont', 'Fuente de Cuerpo')}>
                <select
                    value={data.bodyFont || 'Mulish'}
                    onChange={(e) => updateData('bodyFont', e.target.value)}
                    className="w-full py-2.5 px-3 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    {FONT_OPTIONS.map(font => (
                        <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                </select>
            </ControlGroup>

            {/* Button Font */}
            <ControlGroup label={t('landingEditor.buttonFont', 'Fuente de Botones')}>
                <select
                    value={data.buttonFont || 'Open Sans'}
                    onChange={(e) => updateData('buttonFont', e.target.value)}
                    className="w-full py-2.5 px-3 rounded-lg bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    {FONT_OPTIONS.map(font => (
                        <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                </select>
            </ControlGroup>

            {/* Caps Options */}
            <div className="border-t border-border pt-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    {t('landingEditor.allCaps', 'MAYÚSCULAS (ALL CAPS)')}
                </label>
                <div className="space-y-3">
                    <Toggle
                        label={t('landingEditor.headingsCaps', 'Encabezados')}
                        checked={data.headingsCaps || false}
                        onChange={(v) => updateData('headingsCaps', v)}
                    />
                    <Toggle
                        label={t('landingEditor.buttonsCaps', 'Botones')}
                        checked={data.buttonsCaps || false}
                        onChange={(v) => updateData('buttonsCaps', v)}
                    />
                    <Toggle
                        label={t('landingEditor.navLinksCaps', 'Enlaces de Navegación')}
                        checked={data.navLinksCaps || false}
                        onChange={(v) => updateData('navLinksCaps', v)}
                    />
                </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    {t('landingEditor.preview', 'VISTA PREVIA')}
                </label>
                <div className="bg-background rounded-lg p-4 space-y-2">
                    <h3 className="text-lg font-bold" style={{ fontFamily: data.headingFont || 'Open Sans' }}>
                        {t('landingEditor.exampleTitle', 'Título de Ejemplo')}
                    </h3>
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: data.bodyFont || 'Mulish' }}>
                        {t('landingEditor.exampleBody', 'Este es un párrafo de ejemplo para visualizar cómo se verá el texto del cuerpo en tu sitio web. Una buena tipografía mejora la legibilidad.')}
                    </p>
                </div>
            </div>
        </div>
    );

    // ========================================================================
    // GENERIC CONTROLS (for unsupported section types)
    // ========================================================================
    const renderGenericControls = () => (
        <div className="space-y-6">
            <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                <TextInput
                    value={data.title || ''}
                    onChange={(v) => updateData('title', v)}
                    placeholder="Título"
                />
            </ControlGroup>

            <ControlGroup label={t('landingEditor.content', 'Contenido')}>
                <TextInput
                    value={data.content || ''}
                    onChange={(v) => updateData('content', v)}
                    placeholder="Contenido"
                    multiline
                />
            </ControlGroup>

            <Toggle
                label={t('landingEditor.enabled', 'Habilitado')}
                checked={section.enabled}
                onChange={() => { }}
            />
        </div>
    );

    // Sections that don't need tabs (global settings)
    const hideTabs = ['typography', 'header', 'colors', 'globalStyles'].includes(section.type);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Tabs - hidden for global settings */}
            {!hideTabs && (
                <div className="shrink-0 flex border-b border-border">
                    <TabButton tab="content" label={t('landingEditor.content', 'Contenido')} />
                    <TabButton tab="style" label={t('landingEditor.style', 'Estilo')} />
                </div>
            )}

            {/* Controls */}
            <div className="flex-1 overflow-y-auto p-4">
                {renderControls()}
            </div>

            {/* Apply button - fixed at bottom using flexbox */}
            <div className="shrink-0 p-4 border-t border-border bg-card">
                <button
                    onClick={onRefreshPreview}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                    <Eye size={16} />
                    {t('landingEditor.applyChanges', 'Aplicar cambios')}
                </button>
            </div>
            {/* Image Picker Modal */}
            <ImagePickerModal
                isOpen={isImagePickerOpen}
                onClose={() => {
                    setIsImagePickerOpen(false);
                    setImageTargetIndex(null);
                }}
                onSelect={(url) => {
                    try {
                        console.log('ImagePicker onSelect:', { url, imageTargetField, imageTargetIndex });

                        if (imageTargetField === 'carouselImage' && imageTargetIndex !== null) {
                            const rawImages = Array.isArray(data.images) ? data.images : [];
                            // Ensure strict object structure to prevent string spreading issues
                            const currentImages = rawImages.map((img: any) =>
                                typeof img === 'string' ? { url: img, title: '', subtitle: '' } : { ...img }
                            );

                            if (currentImages[imageTargetIndex]) {
                                currentImages[imageTargetIndex].url = url;
                                updateData('images', currentImages);
                            } else {
                                console.error('Target index out of bounds:', imageTargetIndex);
                            }
                        } else {
                            updateData(imageTargetField, url);
                        }
                    } catch (error) {
                        console.error('Error in ImagePicker onSelect:', error);
                    } finally {
                        setIsImagePickerOpen(false);
                        setImageTargetIndex(null);
                    }
                }}
                title={t('landingEditor.selectImage', 'Seleccionar Imagen')}
            />

            {/* AI Image Generator Modal */}
            {isAIGeneratorOpen && (
                <ImageGeneratorModal
                    isOpen={isAIGeneratorOpen}
                    onClose={() => setIsAIGeneratorOpen(false)}
                    destination="global"
                />
            )}
        </div>
    );
};

export default LandingPageControls;
