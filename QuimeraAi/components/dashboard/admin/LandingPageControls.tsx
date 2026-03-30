/**
 * LandingPageControls
 * Section-specific controls for the Landing Page Editor
 * Each section type has its own control panel with editable properties
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Type, Image, Palette, AlignLeft, AlignCenter, AlignRight,
    Eye, EyeOff, Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
    Sparkles, Link2, Upload, Bold, Italic, Underline, List,
    LayoutGrid, Columns, Rows, Clock, Play, Pause, Settings, ImageIcon,
    RotateCcw, Info, Loader2, Grid, Check, FileText
} from 'lucide-react';
import ImagePicker from '../../ui/ImagePicker';
import ImagePickerModal from '../../ui/ImagePickerModal';
import ImageGeneratorModal from '../../ui/ImageGeneratorModal';
import ColorControl from '../../ui/ColorControl';
import CoolorsImporter from '../../ui/CoolorsImporter';
import FontFamilyPicker from '../../ui/FontFamilyPicker';
import FontWeightPicker from '../../ui/FontWeightPicker';
import { GlobalColors, FontFamily } from '../../../types';
import { colorPalettes, getDefaultGlobalColors } from '../../../data/colorPalettes';
import { fontOptions, formatFontName, getFontStack, loadAllFonts, resolveFontFamily } from '../../../utils/fontLoader';

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
    <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{label}</label>
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
        onChange(newValue);
    };
    if (multiline) {
        return (
            <textarea
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg border border-editor-border bg-editor-bg text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-editor-accent/50"
            />
        );
    }
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-lg border border-editor-border bg-editor-bg text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent/50"
        />
    );
};

const Toggle: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-editor-text-primary">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${checked ? 'bg-primary' : 'bg-editor-text-secondary/30'} relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-editor-accent focus:ring-offset-2 focus:ring-offset-editor-bg`}
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
        <span className="text-sm text-editor-text-primary">{label}</span>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-editor-border bg-editor-bg text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent/50"
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
    <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <div className="flex items-center justify-between">
            <span className="text-sm text-editor-text-primary">{label}</span>
            <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{value}{unit}</span>
        </div>
        <input
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
        />
    </div>
);

// Font size segmented selector (dashboard theme)
const FontSizeSelector: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
}> = ({ label, value, onChange }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
        <div className="flex bg-editor-panel-bg p-1 rounded-md border border-editor-border">
            {['sm', 'md', 'lg', 'xl'].map((size) => (
                <button
                    key={size}
                    onClick={() => onChange(size)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                >
                    {size.toUpperCase()}
                </button>
            ))}
        </div>
    </div>
);

// Padding segmented selector (dashboard theme)
const PaddingSelector: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
    showNone?: boolean;
    showXl?: boolean;
}> = ({ label, value, onChange, showNone = false, showXl = false }) => {
    const options = [
        ...(showNone ? ['none'] : []),
        'sm', 'md', 'lg',
        ...(showXl ? ['xl'] : []),
    ];
    return (
        <div className="mb-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>
            <div className="flex bg-editor-panel-bg p-1 rounded-md border border-editor-border">
                {options.map((size) => (
                    <button
                        key={size}
                        onClick={() => onChange(size)}
                        className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${value === size ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'}`}
                    >
                        {size === 'none' ? '0' : size.toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};

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
    const [showPresetPalettes, setShowPresetPalettes] = useState(false); // Collapsed by default
    const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
    const [isApplyingPalette, setIsApplyingPalette] = useState(false);
    const [globalColors, setGlobalColors] = useState<GlobalColors | null>(null);
    const [paletteHistory, setPaletteHistory] = useState<Array<{ id: string, name: string, colors: GlobalColors, preview: string[], usedAt: Date }>>([]);

    // Preload ALL fonts when typography controls are visible (matches GlobalStylesControl.tsx)
    useEffect(() => {
        if (section.type === 'typography' || section.type === 'colors') {
            loadAllFonts();
        }
    }, [section.type]);

    // Get section data with defaults
    const data = section.data || {};

    // Update handler - use the ACTUAL section.id from props (not a mapped ID)
    // This ensures we update the correct section in the state
    const updateData = (key: string, value: any) => {
        const newData = { ...data, [key]: value };
        try {
            // Use the ACTUAL section ID from props - this is the ID in the state array
            onUpdateSection(section.id, newData);
        } catch (error: any) {
        }
    };

    // Helper to update nested data paths like 'colors.background'
    const updateNestedData = (path: string, value: any) => {
        const keys = path.split('.');
        const newData = { ...data };
        let current: any = newData;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            current[key] = { ...(current[key] || {}) };
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;

        try {
            onUpdateSection(section.id, newData);
        } catch (error: any) {
        }
    };

    // Tab buttons - matches TabbedControls from web editor
    const TabButton: React.FC<{ tab: 'content' | 'style'; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === tab
                ? 'bg-editor-accent text-white shadow-sm'
                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg/50'
                }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    // Render controls based on section type
    const renderControls = () => {
        switch (section.type) {
            case 'hero':
            case 'heroModern':
            case 'heroGradient':
                return renderHeroControls();
            case 'heroSplit':
                return renderHeroSplitControls();
            case 'features':
                return renderFeaturesControls();
            case 'services':
                return renderServicesControls();
            case 'portfolio':
                return renderPortfolioControls();
            case 'team':
                return renderTeamControls();
            case 'pricing':
                return renderPricingControls();
            case 'testimonials':
                return renderTestimonialsControls();
            case 'faq':
                return renderFaqControls();
            case 'cta':
                return renderCtaControls();
            case 'leads':
                return renderLeadsControls();
            case 'newsletter':
                return renderNewsletterControls();
            case 'video':
                return renderVideoControls();
            case 'slideshow':
                return renderSlideshowControls();
            case 'howItWorks':
                return renderHowItWorksControls();
            case 'map':
                return renderMapControls();
            case 'menu':
                return renderMenuControls();
            case 'banner':
                return renderBannerControls();
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

    // Helper to get recent palettes for ColorControl
    const getRecentPalettes = () => {
        return paletteHistory.map(p => ({
            id: p.id,
            name: p.name,
            preview: p.preview
        }));
    };

    const renderHeroControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.heroTitle', 'Título Principal')}>
                        <TextInput
                            value={data.headline || ''}
                            onChange={(v) => updateData('headline', v)}
                            placeholder="Ej: Crea tu Sitio Web con IA"
                        />
                        <FontSizeSelector
                            label={t('landingEditor.titleSize', 'Tamaño del Título')}
                            value={data.headlineFontSize || 'lg'}
                            onChange={(v) => updateData('headlineFontSize', v)}
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.heroSubtitle', 'Subtítulo')}>
                        <TextInput
                            value={data.subheadline || ''}
                            onChange={(v) => updateData('subheadline', v)}
                            placeholder="Ej: La forma más rápida de crear sitios web profesionales"
                            multiline
                        />
                        <FontSizeSelector
                            label={t('landingEditor.subtitleSize', 'Tamaño del Subtítulo')}
                            value={data.subheadlineFontSize || 'md'}
                            onChange={(v) => updateData('subheadlineFontSize', v)}
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.primaryButton', 'Botón Principal')}>
                        <TextInput
                            value={data.primaryCta || ''}
                            onChange={(v) => updateData('primaryCta', v)}
                            placeholder="Ej: Comenzar Gratis"
                        />
                        <TextInput
                            value={data.primaryCtaLink || ''}
                            onChange={(v) => updateData('primaryCtaLink', v)}
                            placeholder="/register o https://..."
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
                                    value={data.secondaryCta || ''}
                                    onChange={(v) => updateData('secondaryCta', v)}
                                    placeholder="Ej: Ver Demo"
                                />
                                <TextInput
                                    value={data.secondaryCtaLink || ''}
                                    onChange={(v) => updateData('secondaryCtaLink', v)}
                                    placeholder="/demo o https://..."
                                />
                            </>
                        )}
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.heroImage', 'Imagen de Fondo')}>
                        <ImagePicker
                            label="Hero Image"
                            value={data.imageUrl || ''}
                            onChange={(url) => updateData('imageUrl', url)}
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-4">
                        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider block">
                            {t('landingEditor.layout', 'DISEÑO Y ESTRUCTURA')}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'center', icon: AlignCenter, label: 'Centrado' },
                                { id: 'left-top', icon: AlignLeft, label: 'Izquierda' },
                                { id: 'right-bottom', icon: AlignRight, label: 'Derecha' }
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => updateData('textLayout', option.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${data.textLayout === option.id || (!data.textLayout && option.id === 'center')
                                        ? 'bg-editor-accent/10 border-editor-accent text-primary'
                                        : 'bg-editor-panel-bg border-editor-border hover:border-editor-accent/50 text-editor-text-secondary'
                                        }`}
                                    title={option.label}
                                >
                                    <option.icon size={20} className="mb-1" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider block">Colores</label>
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
                    </div>

                    <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider block">Espaciado</label>
                        <RangeControl
                            label={t('landingEditor.padding', 'Padding')}
                            value={data.padding || 80}
                            min={20}
                            max={200}
                            unit="px"
                            onChange={(v) => updateData('padding', v)}
                        />
                    </div>

                    <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                        <Toggle
                            label={t('landingEditor.gradient', 'Mostrar Gradiente')}
                            checked={data.showGradient || false}
                            onChange={(v) => updateData('showGradient', v)}
                        />
                        {data.showGradient && (
                            <div className="mt-4 space-y-4 pl-4 border-l-2 border-editor-accent/20">
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

                    <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 block">
                            {t('landingEditor.overlay', 'SUPERPOSICIÓN (OVERLAY)')}
                        </label>
                        <div className="space-y-4">
                            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-editor-text-secondary">Opacidad</span>
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
    const renderFeaturesControls = () => {
        const currentVariant = data.featuresVariant || 'classic';
        const currentTextAlignment = data.overlayTextAlignment || 'left';
        const showHeader = data.showSectionHeader !== false;

        return (
            <div className="space-y-4">
                {activeTab === 'content' && (
                    <>
                        <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                            <TextInput
                                value={data.title || ''}
                                onChange={(v) => updateData('title', v)}
                                placeholder="Ej: Características"
                            />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                        </ControlGroup>

                        <ControlGroup label={t('landingEditor.sectionSubtitle', 'Descripción')}>
                            <TextInput
                                value={data.description || ''}
                                onChange={(v) => updateData('description', v)}
                                placeholder="Ej: Todo lo que necesitas para tener éxito"
                                multiline
                            />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                        </ControlGroup>

                        <ControlGroup label={t('landingEditor.features', 'Características')}>
                            <div className="space-y-3 mt-2">
                                {(data.items || []).map((feature: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-editor-panel-bg/50 rounded-lg border border-editor-border space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-editor-text-secondary">#{idx + 1}</span>
                                            <button
                                                onClick={() => {
                                                    const newItems = [...(data.items || [])];
                                                    newItems.splice(idx, 1);
                                                    updateData('items', newItems);
                                                }}
                                                className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <TextInput
                                            value={feature.title || ''}
                                            onChange={(v) => {
                                                const newItems = [...(data.items || [])];
                                                newItems[idx] = { ...newItems[idx], title: v };
                                                updateData('items', newItems);
                                            }}
                                            placeholder="Título"
                                        />
                                        <TextInput
                                            value={feature.description || ''}
                                            onChange={(v) => {
                                                const newItems = [...(data.items || [])];
                                                newItems[idx] = { ...newItems[idx], description: v };
                                                updateData('items', newItems);
                                            }}
                                            placeholder="Descripción"
                                            multiline
                                        />
                                        {/* Image picker for feature */}
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-12 h-8 bg-editor-panel-bg rounded overflow-hidden flex-shrink-0 border border-editor-border">
                                                {feature.imageUrl ? (
                                                    <img src={feature.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-editor-text-secondary"><ImageIcon size={10} /></div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => { setImageTargetField('items'); setImageTargetIndex(idx); setIsImagePickerOpen(true); }}
                                                className="shrink-0 p-1.5 rounded bg-editor-panel-bg hover:bg-editor-bg transition-colors"
                                                title={t('landingEditor.selectFromLibrary', 'Seleccionar imagen')}
                                            >
                                                <Image size={14} />
                                            </button>
                                            {feature.imageUrl && (
                                                <button
                                                    onClick={() => {
                                                        const newItems = [...(data.items || [])];
                                                        newItems[idx] = { ...newItems[idx], imageUrl: '' };
                                                        updateData('items', newItems);
                                                    }}
                                                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const newItems = [...(data.items || []), { title: '', description: '', imageUrl: '' }];
                                        updateData('items', newItems);
                                    }}
                                    className="w-full py-2 px-4 rounded-lg border border-dashed border-editor-border text-sm text-editor-text-secondary hover:border-editor-accent hover:text-editor-accent transition-colors flex items-center justify-center gap-2"
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
                        {/* === VARIANT SELECTOR === */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.featuresStyle', 'Estilo de Features')}
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'classic', label: 'Classic', emoji: '📦' },
                                    { id: 'modern', label: 'Bento', emoji: '✨' },
                                    { id: 'bento-premium', label: 'Premium', emoji: '🎯' },
                                    { id: 'image-overlay', label: 'Overlay', emoji: '🖼️' }
                                ].map((variant) => (
                                    <button
                                        key={variant.id}
                                        onClick={() => updateData('featuresVariant', variant.id)}
                                        className={`px-2 py-2 rounded-lg border transition-all text-xs font-medium ${currentVariant === variant.id
                                            ? 'bg-editor-accent text-editor-bg border-editor-accent'
                                            : 'bg-editor-panel-bg border-editor-border hover:border-editor-accent/50 text-editor-text-primary'
                                            }`}
                                    >
                                        {variant.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-editor-text-secondary">
                                {currentVariant === 'classic' && '📦 Grid uniforme tradicional'}
                                {currentVariant === 'modern' && '✨ Grid bento moderno asimétrico'}
                                {currentVariant === 'bento-premium' && '🎯 Bento premium con tarjeta destacada'}
                                {currentVariant === 'image-overlay' && '🖼️ Imágenes con texto superpuesto'}
                            </p>
                        </div>

                        {/* === OVERLAY-SPECIFIC CONTROLS === */}
                        {currentVariant === 'image-overlay' && (
                            <div className="space-y-4 p-3 bg-editor-panel-bg/50 rounded-lg border border-editor-border">
                                <div className="flex items-center gap-2 text-sm font-medium text-editor-text-primary">
                                    <ImageIcon size={14} className="text-editor-accent" />
                                    {t('landingEditor.overlaySettings', 'Configuración de Overlay')}
                                </div>

                                {/* Text Alignment */}
                                <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
                                    <label className="text-xs text-editor-text-secondary">{t('landingEditor.textAlignment', 'Alineación de texto')}</label>
                                    <div className="flex bg-editor-panel-bg p-1 rounded-lg gap-1">
                                        {[
                                            { id: 'left', label: '⬅️ Izq', icon: AlignLeft },
                                            { id: 'center', label: '↔️ Centro', icon: AlignCenter },
                                            { id: 'right', label: '➡️ Der', icon: AlignRight }
                                        ].map((align) => (
                                            <button
                                                key={align.id}
                                                onClick={() => updateData('overlayTextAlignment', align.id)}
                                                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${currentTextAlignment === align.id
                                                    ? 'bg-editor-accent text-editor-bg'
                                                    : 'text-editor-text-secondary hover:bg-editor-bg'
                                                    }`}
                                            >
                                                {align.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Show Section Header Toggle */}
                                <Toggle
                                    label={t('landingEditor.showSectionHeader', 'Mostrar título de sección')}
                                    checked={showHeader}
                                    onChange={(v) => updateData('showSectionHeader', v)}
                                />
                            </div>
                        )}

                        {/* === GRID LAYOUT === */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
                                <LayoutGrid size={12} />
                                {t('landingEditor.gridLayout', 'Grid Layout')}
                            </label>
                            <div className="flex bg-editor-panel-bg p-1 rounded-lg gap-1">
                                {[2, 3, 4].map((cols) => (
                                    <button
                                        key={cols}
                                        onClick={() => updateData('gridColumns', cols)}
                                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${(data.gridColumns || 3) === cols
                                            ? 'bg-editor-accent text-editor-bg'
                                            : 'text-editor-text-secondary hover:bg-editor-bg'
                                            }`}
                                    >
                                        {cols}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* === CARD IMAGE === */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.cardImage', 'Imagen de Tarjeta')}
                            </label>
                            <RangeControl
                                label={t('landingEditor.imageHeight', 'Altura de imagen')}
                                value={data.imageHeight || 200}
                                min={100}
                                max={600}
                                step={10}
                                unit="px"
                                onChange={(v) => updateData('imageHeight', v)}
                            />
                            <SelectControl
                                label={t('landingEditor.objectFit', 'Ajuste de imagen')}
                                value={data.imageObjectFit || 'cover'}
                                options={[
                                    { value: 'cover', label: 'Cubrir' },
                                    { value: 'contain', label: 'Contener' },
                                    { value: 'fill', label: 'Rellenar' },
                                ]}
                                onChange={(v) => updateData('imageObjectFit', v)}
                            />
                        </div>

                        {/* === LAYOUT & PADDING === */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.layout', 'Espaciado')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <SelectControl
                                    label={t('landingEditor.paddingY', 'Padding Vertical')}
                                    value={data.paddingY || 'lg'}
                                    options={[
                                        { value: 'none', label: 'Ninguno' },
                                        { value: 'sm', label: 'Pequeño' },
                                        { value: 'md', label: 'Medio' },
                                        { value: 'lg', label: 'Grande' },
                                        { value: 'xl', label: 'Extra Grande' },
                                    ]}
                                    onChange={(v) => updateData('paddingY', v)}
                                />
                                <SelectControl
                                    label={t('landingEditor.paddingX', 'Padding Horizontal')}
                                    value={data.paddingX || 'lg'}
                                    options={[
                                        { value: 'none', label: 'Ninguno' },
                                        { value: 'sm', label: 'Pequeño' },
                                        { value: 'md', label: 'Medio' },
                                        { value: 'lg', label: 'Grande' },
                                        { value: 'xl', label: 'Extra Grande' },
                                    ]}
                                    onChange={(v) => updateData('paddingX', v)}
                                />
                            </div>
                        </div>

                        {/* === SECTION COLORS === */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.sectionColors', 'Colores de Sección')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.backgroundColor', 'Fondo')}
                                    value={data.colors?.background || '#1e293b'}
                                    onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.headingColor', 'Título')}
                                    value={data.colors?.heading || '#f1f5f9'}
                                    onChange={(v) => updateData('colors', { ...data.colors, heading: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.descriptionColor', 'Descripción')}
                                    value={data.colors?.description || '#94a3b8'}
                                    onChange={(v) => updateData('colors', { ...data.colors, description: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.accentColor', 'Acento')}
                                    value={data.colors?.accent || '#6366f1'}
                                    onChange={(v) => updateData('colors', { ...data.colors, accent: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                        </div>

                        {/* === CARD COLORS === */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.cardColors', 'Colores de Tarjeta')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.cardBackground', 'Fondo')}
                                    value={data.colors?.cardBackground || '#1e293b'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardBackground: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.cardTitle', 'Título')}
                                    value={data.colors?.cardHeading || '#ffffff'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardHeading: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.cardText', 'Texto')}
                                    value={data.colors?.cardText || '#94a3b8'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardText: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.borderColor', 'Borde')}
                                    value={data.colors?.borderColor || '#334155'}
                                    onChange={(v) => updateData('colors', { ...data.colors, borderColor: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                        </div>

                        {/* === ANIMATIONS === */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.animations', 'Animaciones')}
                            </label>
                            <Toggle
                                label={t('landingEditor.enableCardAnimation', 'Activar animaciones')}
                                checked={data.enableCardAnimation !== false}
                                onChange={(v) => updateData('enableCardAnimation', v)}
                            />
                            {data.enableCardAnimation !== false && (
                                <SelectControl
                                    label={t('landingEditor.animationType', 'Tipo de animación')}
                                    value={data.animationType || 'fade-in-up'}
                                    options={[
                                        { value: 'none', label: 'Ninguna' },
                                        { value: 'fade-in', label: 'Fade In' },
                                        { value: 'fade-in-up', label: 'Fade In Up' },
                                        { value: 'fade-in-down', label: 'Fade In Down' },
                                        { value: 'slide-up', label: 'Slide Up' },
                                        { value: 'scale-in', label: 'Scale In' },
                                        { value: 'bounce-in', label: 'Bounce In' },
                                    ]}
                                    onChange={(v) => updateData('animationType', v)}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    // ========================================================================
    // PRICING CONTROLS
    // ========================================================================
    const renderPricingControls = () => {
        const currentVariant = data.pricingVariant || 'classic';
        const tiers = data.tiers || [];

        return (
            <div className="space-y-4">
                {activeTab === 'content' && (
                    <>
                        {/* Section Title & Description */}
                        <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                            <TextInput
                                value={data.title || ''}
                                onChange={(v) => updateData('title', v)}
                                placeholder="Ej: Planes y Precios"
                            />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                        </ControlGroup>

                        <ControlGroup label={t('landingEditor.sectionSubtitle', 'Descripción')}>
                            <TextInput
                                value={data.description || data.subtitle || ''}
                                onChange={(v) => {
                                    updateData('description', v);
                                    updateData('subtitle', v);
                                }}
                                placeholder="Ej: Elige el plan perfecto para ti"
                                multiline
                            />
                        </ControlGroup>

                        {/* Pricing Tiers Management */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.pricingTiers', 'Planes de Precio')}
                            </label>

                            {tiers.map((tier: any, idx: number) => (
                                <div key={idx} className="p-4 bg-editor-panel-bg/50 rounded-lg border border-editor-border space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-editor-text-secondary">
                                            {t('landingEditor.tier', 'Plan')} #{idx + 1}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const newTiers = [...tiers];
                                                newTiers.splice(idx, 1);
                                                updateData('tiers', newTiers);
                                            }}
                                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Plan Name & Price */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <TextInput
                                            value={tier.name || ''}
                                            onChange={(v) => {
                                                const newTiers = [...tiers];
                                                newTiers[idx] = { ...newTiers[idx], name: v };
                                                updateData('tiers', newTiers);
                                            }}
                                            placeholder={t('landingEditor.planName', 'Nombre del plan')}
                                        />
                                        <TextInput
                                            value={tier.price || ''}
                                            onChange={(v) => {
                                                const newTiers = [...tiers];
                                                newTiers[idx] = { ...newTiers[idx], price: v };
                                                updateData('tiers', newTiers);
                                            }}
                                            placeholder={t('landingEditor.price', 'Precio')}
                                        />
                                    </div>

                                    {/* Frequency */}
                                    <TextInput
                                        value={tier.frequency || ''}
                                        onChange={(v) => {
                                            const newTiers = [...tiers];
                                            newTiers[idx] = { ...newTiers[idx], frequency: v };
                                            updateData('tiers', newTiers);
                                        }}
                                        placeholder={t('landingEditor.frequency', 'Frecuencia (ej: /mes)')}
                                    />

                                    {/* Description */}
                                    <TextInput
                                        value={tier.description || ''}
                                        onChange={(v) => {
                                            const newTiers = [...tiers];
                                            newTiers[idx] = { ...newTiers[idx], description: v };
                                            updateData('tiers', newTiers);
                                        }}
                                        placeholder={t('landingEditor.planDescription', 'Descripción del plan')}
                                        multiline
                                    />

                                    {/* Features */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider">
                                            {t('landingEditor.planFeatures', 'Características (una por línea)')}
                                        </label>
                                        <textarea
                                            value={(tier.features || []).join('\n')}
                                            onChange={(e) => {
                                                const newTiers = [...tiers];
                                                newTiers[idx] = {
                                                    ...newTiers[idx],
                                                    features: e.target.value.split('\n').filter(f => f.trim())
                                                };
                                                updateData('tiers', newTiers);
                                            }}
                                            rows={4}
                                            placeholder={t('landingEditor.featurePlaceholder', 'Característica 1\nCaracterística 2\nCaracterística 3')}
                                            className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent resize-none"
                                        />
                                    </div>

                                    {/* Button Text & Link */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <TextInput
                                            value={tier.buttonText || ''}
                                            onChange={(v) => {
                                                const newTiers = [...tiers];
                                                newTiers[idx] = { ...newTiers[idx], buttonText: v };
                                                updateData('tiers', newTiers);
                                            }}
                                            placeholder={t('landingEditor.buttonText', 'Texto del botón')}
                                        />
                                        <TextInput
                                            value={tier.buttonLink || ''}
                                            onChange={(v) => {
                                                const newTiers = [...tiers];
                                                newTiers[idx] = { ...newTiers[idx], buttonLink: v };
                                                updateData('tiers', newTiers);
                                            }}
                                            placeholder={t('landingEditor.buttonLink', 'Enlace del botón')}
                                        />
                                    </div>

                                    {/* Featured Toggle */}
                                    <Toggle
                                        label={t('landingEditor.featuredPlan', 'Plan destacado')}
                                        checked={tier.featured || false}
                                        onChange={(v) => {
                                            const newTiers = [...tiers];
                                            newTiers[idx] = { ...newTiers[idx], featured: v };
                                            updateData('tiers', newTiers);
                                        }}
                                    />
                                </div>
                            ))}

                            {/* Add Tier Button */}
                            <button
                                onClick={() => {
                                    const newTiers = [
                                        ...tiers,
                                        {
                                            name: 'Nuevo Plan',
                                            price: '$0',
                                            frequency: '/mes',
                                            description: '',
                                            features: [],
                                            buttonText: 'Comenzar',
                                            buttonLink: '#',
                                            featured: false
                                        }
                                    ];
                                    updateData('tiers', newTiers);
                                }}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-editor-border text-sm text-editor-text-secondary hover:border-editor-accent hover:text-editor-accent transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('landingEditor.addTier', 'Añadir Plan')}
                            </button>
                        </div>
                    </>
                )}

                {activeTab === 'style' && (
                    <>
                        {/* Variant Selector */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.pricingStyle', 'Estilo de Pricing')}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'classic', label: 'Classic', desc: 'Diseño clásico limpio' },
                                    { value: 'gradient', label: 'Gradient', desc: 'Con fondos degradados' },
                                    { value: 'glassmorphism', label: 'Glass', desc: 'Efecto cristal moderno' },
                                    { value: 'minimalist', label: 'Minimal', desc: 'Minimalista y elegante' }
                                ].map((variant) => (
                                    <button
                                        key={variant.value}
                                        onClick={() => updateData('pricingVariant', variant.value)}
                                        className={`p-3 text-left rounded-lg border transition-all ${currentVariant === variant.value
                                            ? 'bg-editor-accent text-editor-bg border-editor-accent'
                                            : 'bg-editor-panel-bg border-editor-border hover:border-editor-accent/50 text-editor-text-primary'
                                            }`}
                                    >
                                        <div className={`text-xs font-bold mb-1 ${currentVariant === variant.value ? 'text-editor-bg' : 'text-editor-text-primary'}`}>
                                            {variant.label}
                                        </div>
                                        <div className={`text-[10px] ${currentVariant === variant.value ? 'text-editor-bg/80' : 'text-editor-text-secondary'}`}>
                                            {variant.desc}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Spacing Controls */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.spacing', 'Espaciado')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <SelectControl
                                    label={t('landingEditor.paddingY', 'Vertical')}
                                    value={data.paddingY || 'lg'}
                                    options={[
                                        { value: 'none', label: 'Ninguno' },
                                        { value: 'sm', label: 'Pequeño' },
                                        { value: 'md', label: 'Medio' },
                                        { value: 'lg', label: 'Grande' },
                                        { value: 'xl', label: 'Extra Grande' },
                                    ]}
                                    onChange={(v) => updateData('paddingY', v)}
                                />
                                <SelectControl
                                    label={t('landingEditor.paddingX', 'Horizontal')}
                                    value={data.paddingX || 'lg'}
                                    options={[
                                        { value: 'none', label: 'Ninguno' },
                                        { value: 'sm', label: 'Pequeño' },
                                        { value: 'md', label: 'Medio' },
                                        { value: 'lg', label: 'Grande' },
                                        { value: 'xl', label: 'Extra Grande' },
                                    ]}
                                    onChange={(v) => updateData('paddingX', v)}
                                />
                            </div>
                        </div>

                        {/* Card Border Radius */}
                        <SelectControl
                            label={t('landingEditor.cardCorners', 'Esquinas de tarjeta')}
                            value={data.cardBorderRadius || 'xl'}
                            options={[
                                { value: 'none', label: 'Sin redondeo' },
                                { value: 'sm', label: 'Pequeño' },
                                { value: 'md', label: 'Medio' },
                                { value: 'lg', label: 'Grande' },
                                { value: 'xl', label: 'Extra Grande' },
                                { value: '2xl', label: 'Muy Grande' },
                            ]}
                            onChange={(v) => updateData('cardBorderRadius', v)}
                        />

                        {/* Section Colors */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.sectionColors', 'Colores de Sección')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.backgroundColor', 'Fondo')}
                                    value={data.colors?.background || '#1e293b'}
                                    onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.headingColor', 'Título')}
                                    value={data.colors?.heading || '#f1f5f9'}
                                    onChange={(v) => updateData('colors', { ...data.colors, heading: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.descriptionColor', 'Descripción')}
                                    value={data.colors?.description || '#94a3b8'}
                                    onChange={(v) => updateData('colors', { ...data.colors, description: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.textColor', 'Texto')}
                                    value={data.colors?.text || '#94a3b8'}
                                    onChange={(v) => updateData('colors', { ...data.colors, text: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                        </div>

                        {/* Card Colors */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.cardColors', 'Colores de Tarjeta')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.cardBackground', 'Fondo')}
                                    value={data.colors?.cardBackground || '#1f2937'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardBackground: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.cardTitle', 'Título de plan')}
                                    value={data.colors?.cardHeading || '#ffffff'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardHeading: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.cardText', 'Texto de tarjeta')}
                                    value={data.colors?.cardText || '#94a3b8'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardText: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.priceColor', 'Precio')}
                                    value={data.colors?.priceColor || '#ffffff'}
                                    onChange={(v) => updateData('colors', { ...data.colors, priceColor: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.borderColor', 'Borde')}
                                    value={data.colors?.borderColor || '#374151'}
                                    onChange={(v) => updateData('colors', { ...data.colors, borderColor: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.accentColor', 'Acento')}
                                    value={data.colors?.accent || '#6366f1'}
                                    onChange={(v) => updateData('colors', { ...data.colors, accent: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                            <ColorControl
                                label={t('landingEditor.checkmarkColor', 'Color de check ✓')}
                                value={data.colors?.checkmarkColor || '#10b981'}
                                onChange={(v) => updateData('colors', { ...data.colors, checkmarkColor: v })}
                                paletteColors={getSelectedPaletteColors()}
                            />
                        </div>

                        {/* Button Colors */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.buttonColors', 'Colores de Botón')}
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <ColorControl
                                    label={t('landingEditor.buttonBackground', 'Fondo')}
                                    value={data.colors?.buttonBackground || '#6366f1'}
                                    onChange={(v) => updateData('colors', { ...data.colors, buttonBackground: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                                <ColorControl
                                    label={t('landingEditor.buttonText', 'Texto')}
                                    value={data.colors?.buttonText || '#ffffff'}
                                    onChange={(v) => updateData('colors', { ...data.colors, buttonText: v })}
                                    paletteColors={getSelectedPaletteColors()}
                                />
                            </div>
                        </div>

                        {/* Gradient Colors (only for gradient variant) */}
                        {currentVariant === 'gradient' && (
                            <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
                                    <span>✨</span>
                                    {t('landingEditor.gradientColors', 'Colores de Degradado')}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <ColorControl
                                        label={t('landingEditor.gradientStart', 'Inicio')}
                                        value={data.colors?.gradientStart || '#4f46e5'}
                                        onChange={(v) => updateData('colors', { ...data.colors, gradientStart: v })}
                                        paletteColors={getSelectedPaletteColors()}
                                    />
                                    <ColorControl
                                        label={t('landingEditor.gradientEnd', 'Fin')}
                                        value={data.colors?.gradientEnd || '#10b981'}
                                        onChange={(v) => updateData('colors', { ...data.colors, gradientEnd: v })}
                                        paletteColors={getSelectedPaletteColors()}
                                    />
                                </div>
                                <div
                                    className="p-3 rounded-lg"
                                    style={{
                                        backgroundImage: `linear-gradient(135deg, ${data.colors?.gradientStart || '#4f46e5'}, ${data.colors?.gradientEnd || '#10b981'})`
                                    }}
                                >
                                    <p className="text-xs text-white font-semibold text-center">
                                        {t('landingEditor.gradientPreview', 'Vista previa del degradado')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Animations */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.animations', 'Animaciones')}
                            </label>
                            <Toggle
                                label={t('landingEditor.enableAnimations', 'Activar animaciones')}
                                checked={data.enableCardAnimation !== false}
                                onChange={(v) => updateData('enableCardAnimation', v)}
                            />
                            {data.enableCardAnimation !== false && (
                                <SelectControl
                                    label={t('landingEditor.animationType', 'Tipo de animación')}
                                    value={data.animationType || 'fade-in-up'}
                                    options={[
                                        { value: 'none', label: 'Ninguna' },
                                        { value: 'fade-in', label: 'Fade In' },
                                        { value: 'fade-in-up', label: 'Fade In Up' },
                                        { value: 'fade-in-down', label: 'Fade In Down' },
                                        { value: 'slide-up', label: 'Slide Up' },
                                        { value: 'scale-in', label: 'Scale In' },
                                        { value: 'bounce-in', label: 'Bounce In' },
                                    ]}
                                    onChange={(v) => updateData('animationType', v)}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    // ========================================================================
    // TESTIMONIALS CONTROLS
    // ========================================================================
    const renderTestimonialsControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Lo que dicen nuestros clientes"
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.testimonials', 'Testimonios')}>
                        <div className="space-y-3 mt-2">
                            {(data.testimonials || []).map((testimonial: any, idx: number) => (
                                <div key={idx} className="p-3 bg-editor-panel-bg/50 rounded-lg border border-editor-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-editor-text-secondary">Testimonio #{idx + 1}</span>
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
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-editor-border text-sm text-editor-text-secondary hover:border-editor-accent hover:text-editor-accent transition-colors flex items-center justify-center gap-2"
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
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    {/* FAQ Variant Selector */}
                    <ControlGroup label={t('landingEditor.faqStyle', 'Estilo de FAQ')}>
                        <div className="grid grid-cols-2 gap-2">
                            {['classic', 'cards', 'gradient', 'minimal'].map((variant) => (
                                <button
                                    key={variant}
                                    onClick={() => updateData('faqVariant', variant)}
                                    className={`px-3 py-2 rounded-lg border text-sm transition-all capitalize ${(data.faqVariant || 'classic') === variant
                                        ? 'bg-editor-accent text-editor-bg border-editor-accent font-medium'
                                        : 'bg-editor-panel-bg/50 text-editor-text-secondary border-editor-border hover:border-editor-accent'
                                        }`}
                                >
                                    {variant === 'classic' ? 'Clásico' :
                                        variant === 'cards' ? 'Tarjetas' :
                                            variant === 'gradient' ? 'Gradiente' : 'Minimal'}
                                </button>
                            ))}
                        </div>
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: Preguntas Frecuentes"
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.sectionDescription', 'Descripción')}>
                        <TextInput
                            value={data.description || ''}
                            onChange={(v) => updateData('description', v)}
                            placeholder="Ej: Respuestas a las dudas más comunes"
                            multiline
                        />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.faqs', 'Preguntas')}>
                        <div className="space-y-3 mt-2">
                            {(data.items || []).map((faq: any, idx: number) => (
                                <div key={idx} className="p-3 bg-editor-panel-bg/50 rounded-lg border border-editor-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-editor-text-secondary">#{idx + 1}</span>
                                        <button
                                            onClick={() => {
                                                const newItems = [...(data.items || [])];
                                                newItems.splice(idx, 1);
                                                updateData('items', newItems);
                                            }}
                                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <TextInput
                                        value={faq.question || ''}
                                        onChange={(v) => {
                                            const newItems = [...(data.items || [])];
                                            newItems[idx] = { ...newItems[idx], question: v };
                                            updateData('items', newItems);
                                        }}
                                        placeholder="Pregunta"
                                    />
                                    <TextInput
                                        value={faq.answer || ''}
                                        onChange={(v) => {
                                            const newItems = [...(data.items || [])];
                                            newItems[idx] = { ...newItems[idx], answer: v };
                                            updateData('items', newItems);
                                        }}
                                        placeholder="Respuesta"
                                        multiline
                                    />
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newItems = [...(data.items || []), { question: '', answer: '' }];
                                    updateData('items', newItems);
                                }}
                                className="w-full py-2 px-4 rounded-lg border border-dashed border-editor-border text-sm text-editor-text-secondary hover:border-editor-accent hover:text-editor-accent transition-colors flex items-center justify-center gap-2"
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
                    {/* Section Colors */}
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.sectionColors', 'Colores de Sección')}
                        </label>
                        <ColorControl
                            label={t('landingEditor.backgroundColor', 'Fondo')}
                            value={data.colors?.background || '#0f172a'}
                            onChange={(v) => updateNestedData('colors.background', v)}
                            paletteColors={getSelectedPaletteColors()}
                        />
                        <ColorControl
                            label={t('landingEditor.headingColor', 'Título')}
                            value={data.colors?.heading || '#f1f5f9'}
                            onChange={(v) => updateNestedData('colors.heading', v)}
                            paletteColors={getSelectedPaletteColors()}
                        />
                        <ColorControl
                            label={t('landingEditor.descriptionColor', 'Descripción')}
                            value={data.colors?.description || data.colors?.text || '#94a3b8'}
                            onChange={(v) => updateNestedData('colors.description', v)}
                            paletteColors={getSelectedPaletteColors()}
                        />
                        <ColorControl
                            label={t('landingEditor.accentColor', 'Acento')}
                            value={data.colors?.accent || '#6366f1'}
                            onChange={(v) => updateNestedData('colors.accent', v)}
                            paletteColors={getSelectedPaletteColors()}
                        />
                    </div>

                    {/* Card Colors */}
                    <div className="space-y-3 pt-3 border-t border-editor-border">
                        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.cardColors', 'Colores de Tarjeta')}
                        </label>
                        <ColorControl
                            label={t('landingEditor.cardBackground', 'Fondo de Tarjeta')}
                            value={data.colors?.cardBackground || '#1e293b'}
                            onChange={(v) => updateNestedData('colors.cardBackground', v)}
                            paletteColors={getSelectedPaletteColors()}
                        />
                        <ColorControl
                            label={t('landingEditor.questionText', 'Texto de Pregunta')}
                            value={data.colors?.text || '#f1f5f9'}
                            onChange={(v) => updateNestedData('colors.text', v)}
                            paletteColors={getSelectedPaletteColors()}
                        />
                        <ColorControl
                            label={t('landingEditor.borderColor', 'Color de Borde')}
                            value={data.colors?.borderColor || '#334155'}
                            onChange={(v) => updateNestedData('colors.borderColor', v)}
                            paletteColors={getSelectedPaletteColors()}
                        />
                    </div>

                    {/* Gradient Colors (for gradient variant) */}
                    {data.faqVariant === 'gradient' && (
                        <div className="space-y-3 pt-3 border-t border-editor-border">
                            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.gradientColors', 'Colores de Gradiente')}
                            </label>
                            <ColorControl
                                label={t('landingEditor.gradientStart', 'Inicio del Gradiente')}
                                value={data.colors?.gradientStart || '#6366f1'}
                                onChange={(v) => updateNestedData('colors.gradientStart', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                            <ColorControl
                                label={t('landingEditor.gradientEnd', 'Fin del Gradiente')}
                                value={data.colors?.gradientEnd || '#8b5cf6'}
                                onChange={(v) => updateNestedData('colors.gradientEnd', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                        </div>
                    )}

                    {/* Spacing */}
                    <div className="space-y-3 pt-3 border-t border-editor-border">
                        <SelectControl
                            label={t('landingEditor.verticalPadding', 'Espaciado Vertical')}
                            value={data.paddingY || 'lg'}
                            options={[
                                { value: 'none', label: 'Ninguno' },
                                { value: 'sm', label: 'Pequeño' },
                                { value: 'md', label: 'Mediano' },
                                { value: 'lg', label: 'Grande' },
                                { value: 'xl', label: 'Extra Grande' },
                            ]}
                            onChange={(v) => updateData('paddingY', v)}
                        />
                        <SelectControl
                            label={t('landingEditor.horizontalPadding', 'Espaciado Horizontal')}
                            value={data.paddingX || 'lg'}
                            options={[
                                { value: 'none', label: 'Ninguno' },
                                { value: 'sm', label: 'Pequeño' },
                                { value: 'md', label: 'Mediano' },
                                { value: 'lg', label: 'Grande' },
                                { value: 'xl', label: 'Extra Grande' },
                            ]}
                            onChange={(v) => updateData('paddingX', v)}
                        />
                    </div>
                </>
            )}
        </div>
    );

    // ========================================================================
    // CTA CONTROLS
    // ========================================================================
    const renderCtaControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    {/* Title */}
                    <ControlGroup label={t('landingEditor.ctaTitle', 'Título')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder="Ej: ¿Listo para empezar?"
                        />
                    </ControlGroup>

                    {/* Title Font Size */}
                    <SelectControl
                        label={t('landingEditor.titleSize', 'Tamaño del Título')}
                        value={data.titleFontSize || 'lg'}
                        options={[
                            { value: 'sm', label: 'Pequeño' },
                            { value: 'md', label: 'Mediano' },
                            { value: 'lg', label: 'Grande' },
                            { value: 'xl', label: 'Extra Grande' },
                        ]}
                        onChange={(v) => updateData('titleFontSize', v)}
                    />

                    {/* Description */}
                    <ControlGroup label={t('landingEditor.ctaDescription', 'Descripción')}>
                        <TextInput
                            value={data.description || data.subtitle || ''}
                            onChange={(v) => updateData('description', v)}
                            placeholder="Ej: Crea tu sitio web en minutos"
                            multiline
                        />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                    </ControlGroup>

                    {/* Description Font Size */}
                    <SelectControl
                        label={t('landingEditor.descriptionSize', 'Tamaño de Descripción')}
                        value={data.descriptionFontSize || 'md'}
                        options={[
                            { value: 'sm', label: 'Pequeño' },
                            { value: 'md', label: 'Mediano' },
                            { value: 'lg', label: 'Grande' },
                        ]}
                        onChange={(v) => updateData('descriptionFontSize', v)}
                    />

                    {/* Button Text */}
                    <ControlGroup label={t('landingEditor.ctaButtonText', 'Texto del Botón')}>
                        <TextInput
                            value={data.buttonText || ''}
                            onChange={(v) => updateData('buttonText', v)}
                            placeholder="Ej: Comenzar Ahora"
                        />
                    </ControlGroup>

                    {/* Link Type Selector */}
                    <ControlGroup label={t('landingEditor.linkType', 'Tipo de Enlace')}>
                        <div className="flex bg-editor-panel-bg/50 rounded-md border border-editor-border p-1">
                            {[
                                { value: 'manual', label: 'URL' },
                                { value: 'section', label: 'Sección' },
                            ].map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => updateData('linkType', type.value)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${(data.linkType || 'manual') === type.value
                                        ? 'bg-editor-accent text-editor-bg'
                                        : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </ControlGroup>

                    {/* Button Link based on type */}
                    {(data.linkType === 'manual' || !data.linkType) && (
                        <ControlGroup label={t('landingEditor.buttonUrl', 'URL del Botón')}>
                            <TextInput
                                value={data.buttonUrl || data.buttonLink || ''}
                                onChange={(v) => updateData('buttonUrl', v)}
                                placeholder="https://example.com"
                            />
                            <p className="text-xs text-editor-text-secondary mt-1">
                                Usa URLs para enlaces externos o rutas relativas (/registro)
                            </p>
                        </ControlGroup>
                    )}

                    {data.linkType === 'section' && (
                        <ControlGroup label={t('landingEditor.sectionAnchor', 'Ancla de Sección')}>
                            <TextInput
                                value={data.buttonUrl || data.buttonLink || ''}
                                onChange={(v) => updateData('buttonUrl', v)}
                                placeholder="#contacto"
                            />
                            <p className="text-xs text-editor-text-secondary mt-1">
                                Usa # seguido del ID de la sección (ej: #contacto, #precios)
                            </p>
                        </ControlGroup>
                    )}
                </>
            )}

            {activeTab === 'style' && (
                <>
                    {/* Spacing */}
                    <ControlGroup label={t('landingEditor.spacing', 'Espaciado')}>
                        <SelectControl
                            label={t('landingEditor.verticalPadding', 'Vertical')}
                            value={data.paddingY || 'lg'}
                            options={[
                                { value: 'none', label: 'Ninguno' },
                                { value: 'sm', label: 'Pequeño' },
                                { value: 'md', label: 'Mediano' },
                                { value: 'lg', label: 'Grande' },
                                { value: 'xl', label: 'Extra Grande' },
                            ]}
                            onChange={(v) => updateData('paddingY', v)}
                        />
                        <SelectControl
                            label={t('landingEditor.horizontalPadding', 'Horizontal')}
                            value={data.paddingX || 'lg'}
                            options={[
                                { value: 'none', label: 'Ninguno' },
                                { value: 'sm', label: 'Pequeño' },
                                { value: 'md', label: 'Mediano' },
                                { value: 'lg', label: 'Grande' },
                                { value: 'xl', label: 'Extra Grande' },
                            ]}
                            onChange={(v) => updateData('paddingX', v)}
                        />
                    </ControlGroup>

                    {/* Section Colors */}
                    <ControlGroup label={t('landingEditor.sectionColors', 'Colores de Sección')}>
                        <ColorControl
                            label={t('landingEditor.backgroundColor', 'Fondo de Sección')}
                            value={data.colors?.background || data.backgroundColor || '#0f172a'}
                            onChange={(v) => {
                                updateData('backgroundColor', v);
                                updateNestedData('colors.background', v);
                            }}
                        />
                    </ControlGroup>

                    {/* Card Gradient */}
                    <ControlGroup label={t('landingEditor.cardGradient', 'Gradiente de Tarjeta')}>
                        <ColorControl
                            label={t('landingEditor.gradientStart', 'Inicio del Gradiente')}
                            value={data.colors?.gradientStart || '#4f46e5'}
                            onChange={(v) => updateNestedData('colors.gradientStart', v)}
                        />
                        <ColorControl
                            label={t('landingEditor.gradientEnd', 'Fin del Gradiente')}
                            value={data.colors?.gradientEnd || '#7c3aed'}
                            onChange={(v) => updateNestedData('colors.gradientEnd', v)}
                        />
                        {/* Gradient Preview */}
                        <div
                            className="h-8 rounded-lg border border-editor-border"
                            style={{
                                backgroundImage: `linear-gradient(135deg, ${data.colors?.gradientStart || '#4f46e5'}, ${data.colors?.gradientEnd || '#7c3aed'})`
                            }}
                        />
                    </ControlGroup>

                    {/* Text & Button */}
                    <ControlGroup label={t('landingEditor.textAndButtonColors', 'Texto y Botón')}>
                        <ColorControl
                            label={t('landingEditor.headingColor', 'Color del Título')}
                            value={data.colors?.heading || data.textColor || '#ffffff'}
                            onChange={(v) => {
                                updateData('textColor', v);
                                updateNestedData('colors.heading', v);
                            }}
                        />
                        <ColorControl
                            label={t('landingEditor.descriptionColor', 'Color de Descripción')}
                            value={data.colors?.text || '#e2e8f0'}
                            onChange={(v) => updateNestedData('colors.text', v)}
                        />
                        <ColorControl
                            label={t('landingEditor.buttonBackground', 'Fondo del Botón')}
                            value={data.colors?.buttonBackground || '#ffffff'}
                            onChange={(v) => updateNestedData('colors.buttonBackground', v)}
                        />
                        <ColorControl
                            label={t('landingEditor.buttonText', 'Texto del Botón')}
                            value={data.colors?.buttonText || '#4f46e5'}
                            onChange={(v) => updateNestedData('colors.buttonText', v)}
                        />
                    </ControlGroup>

                    {/* Corner Gradient */}
                    <ControlGroup label={t('landingEditor.cornerGradient', 'Gradiente de Esquina')}>
                        <Toggle
                            label={t('landingEditor.enableCornerGradient', 'Activar gradiente de esquina')}
                            checked={data.cornerGradient?.enabled || false}
                            onChange={(v) => updateNestedData('cornerGradient.enabled', v)}
                        />
                        {data.cornerGradient?.enabled && (
                            <>
                                <SelectControl
                                    label={t('landingEditor.position', 'Posición')}
                                    value={data.cornerGradient?.position || 'top-left'}
                                    options={[
                                        { value: 'top-left', label: 'Superior Izquierda' },
                                        { value: 'top-right', label: 'Superior Derecha' },
                                        { value: 'bottom-left', label: 'Inferior Izquierda' },
                                        { value: 'bottom-right', label: 'Inferior Derecha' },
                                    ]}
                                    onChange={(v) => updateNestedData('cornerGradient.position', v)}
                                />
                                <ColorControl
                                    label={t('landingEditor.gradientColor', 'Color del Gradiente')}
                                    value={data.cornerGradient?.color || '#ffffff'}
                                    onChange={(v) => updateNestedData('cornerGradient.color', v)}
                                />
                                <RangeControl
                                    label={`${t('landingEditor.opacity', 'Opacidad')}: ${data.cornerGradient?.opacity || 20}%`}
                                    value={data.cornerGradient?.opacity || 20}
                                    min={0}
                                    max={100}
                                    unit="%"
                                    onChange={(v) => updateNestedData('cornerGradient.opacity', v)}
                                />
                                <RangeControl
                                    label={`${t('landingEditor.size', 'Tamaño')}: ${data.cornerGradient?.size || 50}%`}
                                    value={data.cornerGradient?.size || 50}
                                    min={20}
                                    max={100}
                                    unit="%"
                                    onChange={(v) => updateNestedData('cornerGradient.size', v)}
                                />
                            </>
                        )}
                    </ControlGroup>

                    {/* Background Pattern */}
                    <ControlGroup label={t('landingEditor.showPattern', 'Patrón de Fondo')}>
                        <Toggle
                            label={t('landingEditor.showPattern', 'Mostrar patrón de fondo')}
                            checked={data.showPattern ?? false}
                            onChange={(v) => updateData('showPattern', v)}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // FOOTER CONTROLS
    // ========================================================================
    const renderFooterControls = () => (
        <div className="space-y-4">
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
                        value={data.colors?.background || data.backgroundColor || '#111827'}
                        onChange={(v) => {
                            updateData('backgroundColor', v);
                            updateData('colors', { ...(data.colors || {}), background: v });
                        }}
                        paletteColors={getSelectedPaletteColors()}
                        recentPalettes={getRecentPalettes()}
                    />

                    <ColorControl
                        label={t('landingEditor.textColor', 'Color de Texto')}
                        value={data.colors?.text || data.textColor || '#9ca3af'}
                        onChange={(v) => {
                            updateData('textColor', v);
                            updateData('colors', { ...(data.colors || {}), text: v });
                        }}
                        paletteColors={getSelectedPaletteColors()}
                        recentPalettes={getRecentPalettes()}
                    />

                    <ColorControl
                        label={t('landingEditor.headingColor', 'Color de Títulos')}
                        value={data.colors?.heading || '#f9fafb'}
                        onChange={(v) => {
                            updateData('colors', { ...(data.colors || {}), heading: v });
                        }}
                        paletteColors={getSelectedPaletteColors()}
                        recentPalettes={getRecentPalettes()}
                    />

                    <ColorControl
                        label={t('landingEditor.borderColor', 'Color de Bordes')}
                        value={data.colors?.border || '#374151'}
                        onChange={(v) => {
                            updateData('colors', { ...(data.colors || {}), border: v });
                        }}
                        paletteColors={getSelectedPaletteColors()}
                        recentPalettes={getRecentPalettes()}
                    />

                    <ColorControl
                        label={t('landingEditor.linkHoverColor', 'Color Hover de Enlaces')}
                        value={data.colors?.linkHover || '#ffffff'}
                        onChange={(v) => {
                            updateData('colors', { ...(data.colors || {}), linkHover: v });
                        }}
                        paletteColors={getSelectedPaletteColors()}
                        recentPalettes={getRecentPalettes()}
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
        <div className="space-y-4">
            {/* Logo Type Selector */}
            <ControlGroup label={t('landingEditor.logoType', 'Tipo de Logo')}>
                <SelectControl
                    label=""
                    value={data.logoType || 'text'}
                    onChange={(v) => updateData('logoType', v)}
                    options={[
                        { value: 'text', label: t('landingEditor.logoTypeText', 'Solo Texto') },
                        { value: 'image', label: t('landingEditor.logoTypeImage', 'Solo Imagen') },
                        { value: 'both', label: t('landingEditor.logoTypeBoth', 'Imagen + Texto') },
                    ]}
                />
            </ControlGroup>

            {/* Logo Image - Show if type is 'image' or 'both' */}
            {(data.logoType === 'image' || data.logoType === 'both' || data.logoImage) && (
                <ControlGroup label={t('landingEditor.logoImage', 'Imagen del Logo')}>
                    <div className="space-y-3">
                        {data.logoImage && (
                            <div className="relative w-full h-20 rounded-lg border border-editor-border overflow-hidden bg-editor-panel-bg flex items-center justify-center">
                                <img
                                    src={data.logoImage}
                                    alt="Logo"
                                    className="max-h-full max-w-full object-contain"
                                />
                                <button
                                    onClick={() => {
                                        updateData('logoImage', '');
                                        if (data.logoType === 'image') {
                                            updateData('logoType', 'text');
                                        }
                                    }}
                                    className="absolute top-1 right-1 p-1 rounded bg-destructive/80 text-white hover:bg-destructive"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setIsLogoPickerOpen(true)}
                            className="w-full py-3 px-4 rounded-lg border border-dashed border-editor-accent/50 text-editor-accent hover:bg-editor-accent/5 transition-colors flex items-center justify-center gap-2"
                        >
                            <Image size={18} />
                            {data.logoImage
                                ? t('landingEditor.changeLogo', 'Cambiar Logo')
                                : t('landingEditor.selectLogo', 'Seleccionar Logo')
                            }
                        </button>
                    </div>
                </ControlGroup>
            )}

            {/* Logo Size - Show if there's an image */}
            {data.logoImage && (
                <ControlGroup label={t('landingEditor.logoSize', 'Tamaño del Logo')}>
                    <RangeControl
                        label=""
                        value={data.logoWidth || 120}
                        onChange={(v) => updateData('logoWidth', v)}
                        min={40}
                        max={250}
                        unit="px"
                    />
                </ControlGroup>
            )}

            {/* Logo Text - Show if type is 'text' or 'both' */}
            {(data.logoType === 'text' || data.logoType === 'both' || !data.logoType) && (
                <ControlGroup label={t('landingEditor.logoText', 'Texto del Logo')}>
                    <TextInput
                        value={data.logoText || ''}
                        onChange={(v) => updateData('logoText', v)}
                        placeholder="Ej: Quimera.ai"
                    />
                </ControlGroup>
            )}

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
            <div className="border-t border-editor-border pt-4 mt-4">
                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 block">
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
                        value={data.colors?.background || data.backgroundColor || '#000000'}
                        onChange={(v) => {
                            updateData('backgroundColor', v);
                            updateData('colors', { ...(data.colors || {}), background: v });
                        }}
                        paletteColors={getSelectedPaletteColors()}
                        recentPalettes={getRecentPalettes()}
                    />

                    <ColorControl
                        label={t('landingEditor.textColor', 'Color de Texto')}
                        value={data.colors?.text || data.textColor || '#f1f5f9'}
                        onChange={(v) => {
                            updateData('textColor', v);
                            updateData('colors', { ...(data.colors || {}), text: v });
                        }}
                        paletteColors={getSelectedPaletteColors()}
                        recentPalettes={getRecentPalettes()}
                    />

                    <ColorControl
                        label={t('landingEditor.accentColor', 'Color de Acento')}
                        value={data.colors?.accent || data.accentColor || '#6366f1'}
                        onChange={(v) => {
                            updateData('accentColor', v);
                            updateData('colors', { ...(data.colors || {}), accent: v });
                        }}
                        paletteColors={getSelectedPaletteColors()}
                        recentPalettes={getRecentPalettes()}
                    />
                </div>
            </div>

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
            <div className="space-y-4">
                {activeTab === 'content' && (
                    <>
                        <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                            <TextInput
                                value={data.title || ''}
                                onChange={(v) => updateData('title', v)}
                                placeholder="Ej: Nuestra Galería"
                            />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                        </ControlGroup>

                        <ControlGroup label={t('landingEditor.sectionSubtitle', 'Descripción')}>
                            <TextInput
                                value={data.subtitle || ''}
                                onChange={(v) => updateData('subtitle', v)}
                                placeholder="Ej: Un vistazo a nuestros proyectos"
                                multiline
                            />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.subtitleFontSize || 'md'}
                            onChange={(v) => updateData('subtitleFontSize', v)}
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
                                    <div key={idx} className="p-3 bg-editor-panel-bg/50 rounded-lg border border-editor-border space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="relative w-16 h-10 bg-editor-panel-bg rounded overflow-hidden flex-shrink-0 border border-editor-border">
                                                {image.url ? (
                                                    <img src={image.url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-editor-text-secondary"><Image size={12} /></div>
                                                )}
                                            </div>

                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => { setImageTargetField('carouselImage'); setImageTargetIndex(idx); setIsImagePickerOpen(true); }}
                                                    className="shrink-0 p-2 rounded-lg bg-editor-panel-bg hover:bg-editor-bg transition-colors"
                                                    title={t('landingEditor.selectFromLibrary', 'Seleccionar de librería')}
                                                >
                                                    <Image size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setImageTargetField('carouselImage'); setImageTargetIndex(idx); setIsAIGeneratorOpen(true); }}
                                                    className="shrink-0 p-2 rounded-lg bg-editor-accent/10 text-editor-accent hover:bg-editor-accent/20 transition-colors"
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
                                            <div className="pl-2 border-l-2 border-editor-accent/20 space-y-2 animate-in slide-in-from-left-2 duration-200">
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
                                    className="w-full py-2 px-4 rounded-lg border border-dashed border-editor-border text-sm text-editor-text-secondary hover:border-editor-accent hover:text-editor-accent transition-colors flex items-center justify-center gap-2"
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
            // Add to palette history
            const historyEntry = {
                id: `coolors-${Date.now()}`,
                name: _paletteName || 'Paleta Coolors',
                colors: colors,
                preview: allColors.slice(0, 5),
                usedAt: new Date()
            };
            setPaletteHistory(prev => {
                // Remove duplicates and limit to 10
                const filtered = prev.filter(p => JSON.stringify(p.colors) !== JSON.stringify(colors));
                return [historyEntry, ...filtered].slice(0, 10);
            });

            setShowCoolorsImporter(false);
            setSelectedPaletteId(null);
        } finally {
            setIsApplyingPalette(false);
        }
    };

    const handlePaletteSelect = async (palette: { id: string; colors: GlobalColors; nameEs?: string; preview?: string[] }) => {
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

            // Add to palette history
            const historyEntry = {
                id: palette.id,
                name: palette.nameEs || 'Paleta',
                colors: palette.colors,
                preview: palette.preview || [palette.colors.primary, palette.colors.secondary, palette.colors.accent, palette.colors.background],
                usedAt: new Date()
            };
            setPaletteHistory(prev => {
                // Remove duplicates and limit to 10
                const filtered = prev.filter(p => p.id !== palette.id);
                return [historyEntry, ...filtered].slice(0, 10);
            });
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
        <div className="space-y-4">
            {/* Coolors.co Importer Section */}
            <div className="border border-dashed border-purple-500/30 rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowCoolorsImporter(!showCoolorsImporter)}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all"
                >
                    <div className="flex items-center gap-2">
                        <Upload size={16} className="text-purple-400" />
                        <span className="text-sm font-medium text-editor-text-primary">
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

            {/* Palette History Section */}
            {paletteHistory.length > 0 && (
                <div className="border border-editor-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-editor-panel-bg/50">
                        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} className="text-editor-accent" />
                            {t('landingEditor.paletteHistory', 'Paletas Recientes')}
                        </label>
                        <span className="text-xs text-editor-text-secondary">
                            {paletteHistory.length}/10
                        </span>
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-2">
                        {paletteHistory.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => handlePaletteSelect({
                                    id: entry.id,
                                    colors: entry.colors,
                                    nameEs: entry.name,
                                    preview: entry.preview
                                })}
                                disabled={isApplyingPalette}
                                className={`relative p-2 rounded-lg border transition-all text-left ${selectedPaletteId === entry.id
                                    ? 'border-editor-accent ring-1 ring-editor-accent bg-editor-accent/10'
                                    : 'border-editor-border hover:border-editor-accent/50 bg-editor-bg hover:bg-editor-panel-bg/50'
                                    } ${isApplyingPalette ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                            >
                                <div className="flex gap-0.5 mb-1">
                                    {entry.preview.slice(0, 5).map((color, idx) => (
                                        <div
                                            key={idx}
                                            className="w-4 h-4 rounded border border-white/10"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs font-medium text-editor-text-primary truncate">
                                    {entry.name}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Palettes Section - Collapsible */}
            <div className="border border-dashed border-editor-border rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowPresetPalettes(!showPresetPalettes)}
                    className="w-full flex items-center justify-between p-3 bg-editor-panel-bg/20 hover:bg-editor-panel-bg/40 transition-all"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-editor-accent" />
                        <span className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.presetPalettes', 'Paletas Predefinidas')}
                        </span>
                        <span className="text-xs text-editor-text-secondary">
                            ({colorPalettes.length})
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleResetColors(); }}
                            disabled={isApplyingPalette}
                            className="text-xs text-editor-text-secondary hover:text-editor-accent flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                            <RotateCcw size={12} className={isApplyingPalette ? 'animate-spin' : ''} />
                            {t('landingEditor.reset', 'Reset')}
                        </button>
                        <ChevronDown size={14} className={`text-editor-text-secondary transition-transform ${showPresetPalettes ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {showPresetPalettes && (
                    <div className="p-3 border-t border-editor-border">
                        {/* Info Banner */}
                        <div className="mb-3 p-2.5 bg-editor-accent/10 border border-editor-accent/30 rounded-lg">
                            <p className="text-xs text-editor-accent flex items-start gap-2">
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
                                        ? 'border-editor-accent ring-1 ring-editor-accent bg-editor-accent/10'
                                        : 'border-editor-border hover:border-editor-accent/50 bg-editor-bg hover:bg-editor-panel-bg/50'
                                        } ${isApplyingPalette ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                                >
                                    {/* Selection indicator */}
                                    {selectedPaletteId === palette.id && (
                                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-editor-accent rounded-full flex items-center justify-center">
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
                                    <p className="text-xs font-medium text-editor-text-primary truncate">
                                        {palette.nameEs}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Colors Section - Matches GlobalStylesControl.tsx */}
            <div>
                <label className="block text-xs font-bold text-editor-text-secondary mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Grid size={14} />
                    {t('landingEditor.customColors', 'COLORES PERSONALIZADOS')}
                </label>

                <div className="space-y-4">
                    {/* Colores Principales */}
                    <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                        <p className="text-xs font-semibold text-editor-text-primary mb-3">{t('landingEditor.mainColors', 'Colores Principales')}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <ColorControl
                                label={t('landingEditor.primary', 'PRIMARIO')}
                                value={data.mainColor || data.accentColor || '#FF9505'}
                                onChange={(v) => updateData('mainColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                            <ColorControl
                                label={t('landingEditor.secondary', 'SECUNDARIO')}
                                value={data.secondaryColor || '#E2711D'}
                                onChange={(v) => updateData('secondaryColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                        </div>
                        <div className="mt-3">
                            <ColorControl
                                label={t('landingEditor.accent', 'ACENTO')}
                                value={data.accentColor || '#FFC971'}
                                onChange={(v) => updateData('accentColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                        </div>
                    </div>

                    {/* Fondos */}
                    <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                        <p className="text-xs font-semibold text-editor-text-primary mb-3">{t('landingEditor.backgrounds', 'Fondos')}</p>
                        <div className="space-y-3">
                            <ColorControl
                                label={t('landingEditor.mainBackground', 'FONDO PRINCIPAL')}
                                value={data.backgroundColor || '#000000'}
                                onChange={(v) => updateData('backgroundColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                            <ColorControl
                                label={t('landingEditor.surfaceBackground', 'SUPERFICIE')}
                                value={data.surfaceColor || data.backgroundColor || '#1a1a1a'}
                                onChange={(v) => updateData('surfaceColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                        </div>
                    </div>

                    {/* Texto */}
                    <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                        <p className="text-xs font-semibold text-editor-text-primary mb-3">{t('landingEditor.textColors', 'Texto')}</p>
                        <div className="space-y-3">
                            <ColorControl
                                label={t('landingEditor.text', 'TEXTO')}
                                value={data.textColor || '#ffffff'}
                                onChange={(v) => updateData('textColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                            <ColorControl
                                label={t('landingEditor.headings', 'ENCABEZADOS')}
                                value={data.headingColor || data.textColor || '#ffffff'}
                                onChange={(v) => updateData('headingColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                        </div>
                        <div className="mt-3">
                            <ColorControl
                                label={t('landingEditor.textSecondary', 'TEXTO SECUNDARIO')}
                                value={data.textMutedColor || '#999999'}
                                onChange={(v) => updateData('textMutedColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                        </div>
                    </div>

                    {/* Bordes y Estados */}
                    <div className="bg-editor-panel-bg/30 p-3 rounded-lg border border-editor-border/50">
                        <p className="text-xs font-semibold text-editor-text-primary mb-3">{t('landingEditor.bordersStates', 'Bordes y Estados')}</p>
                        <div className="space-y-3">
                            <ColorControl
                                label={t('landingEditor.borders', 'BORDES')}
                                value={data.borderColor || '#334155'}
                                onChange={(v) => updateData('borderColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                            <ColorControl
                                label={t('landingEditor.success', 'ÉXITO')}
                                value={data.successColor || '#22C55E'}
                                onChange={(v) => updateData('successColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                            <ColorControl
                                label={t('landingEditor.error', 'ERROR')}
                                value={data.errorColor || '#EF4444'}
                                onChange={(v) => updateData('errorColor', v)}
                                paletteColors={getSelectedPaletteColors()}
                            />
                        </div>
                    </div>
                </div>
            </div>

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



    // Render a font select with weight + italic controls (matches GlobalStylesControl.tsx)
    const renderFontSelect = (
        label: string,
        fontKey: string,
        weightKey: string,
        styleKey: string,
        defaultWeight: number = 400
    ) => (
        <div className="mb-5 last:mb-0">
            {/* Font Family Select using FontFamilyPicker */}
            <div className="mb-2">
                <FontFamilyPicker
                    label={label}
                    value={(resolveFontFamily(data[fontKey]) as FontFamily) || 'inter'}
                    onChange={(font) => updateData(fontKey, font)}
                    showPreview={false}
                />
            </div>
            {/* Weight + Italic row */}
            <div className="flex gap-2">
                <FontWeightPicker
                    value={data[weightKey] || defaultWeight}
                    onChange={(weight) => updateData(weightKey, weight)}
                />
                <button
                    onClick={() => {
                        const currentValue = data[styleKey] || 'normal';
                        updateData(styleKey, currentValue === 'normal' ? 'italic' : 'normal');
                    }}
                    className={`flex items-center justify-center w-8 self-stretch rounded-md border transition-all cursor-pointer ${
                        data[styleKey] === 'italic'
                            ? 'bg-editor-accent/20 border-editor-accent text-editor-accent'
                            : 'bg-editor-panel-bg border-editor-border text-editor-text-secondary hover:border-editor-accent/50'
                    }`}
                    title="Italic"
                >
                    <span className="text-sm font-serif italic">I</span>
                </button>
            </div>
        </div>
    );

    const renderTypographyControls = () => (
        <div className="space-y-5">
            {/* Font Controls */}
            <div className="bg-editor-panel-bg/30 p-4 rounded-lg border border-editor-border">
                <label className="block text-xs font-bold text-editor-accent mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Type size={14} />
                    {t('landingEditor.globalFonts', 'FUENTES GLOBALES')}
                </label>
                {renderFontSelect(t('landingEditor.headingFont', 'FUENTE DE ENCABEZADOS'), 'headingFont', 'headingFontWeight', 'headingFontStyle', 700)}
                {renderFontSelect(t('landingEditor.bodyFont', 'FUENTE DE CUERPO'), 'bodyFont', 'bodyFontWeight', 'bodyFontStyle', 400)}
                {renderFontSelect(t('landingEditor.buttonFont', 'FUENTE DE BOTONES'), 'buttonFont', 'buttonFontWeight', 'buttonFontStyle', 600)}

                {/* All Caps Toggles Section */}
                <div className="mt-4 pt-4 border-t border-editor-border/50 space-y-4">
                    <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                        {t('landingEditor.allCaps', 'MAYÚSCULAS (ALL CAPS)')}
                    </label>

                    {/* Headings All Caps */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-editor-text-primary">
                            {t('landingEditor.headingsCaps', 'Encabezados')}
                        </span>
                        <button
                            onClick={() => updateData('headingsCaps', !data.headingsCaps)}
                            className={`${data.headingsCaps ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                        >
                            <span className={`${data.headingsCaps ? 'translate-x-[18px]' : 'translate-x-0'} pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                        </button>
                    </div>

                    {/* Buttons All Caps */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-editor-text-primary">
                            {t('landingEditor.buttonsCaps', 'Botones')}
                        </span>
                        <button
                            onClick={() => updateData('buttonsCaps', !data.buttonsCaps)}
                            className={`${data.buttonsCaps ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                        >
                            <span className={`${data.buttonsCaps ? 'translate-x-[18px]' : 'translate-x-0'} pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                        </button>
                    </div>

                    {/* Nav Links All Caps */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-editor-text-primary">
                            {t('landingEditor.navLinksCaps', 'Enlaces de Navegación')}
                        </span>
                        <button
                            onClick={() => updateData('navLinksCaps', !data.navLinksCaps)}
                            className={`${data.navLinksCaps ? 'bg-editor-accent' : 'bg-editor-border'} relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                        >
                            <span className={`${data.navLinksCaps ? 'translate-x-[18px]' : 'translate-x-0'} pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Font Preview */}
            <div className="p-4 rounded-lg border border-editor-border bg-editor-bg">
                <p className="text-xs text-editor-text-secondary mb-3 uppercase tracking-wider font-bold">
                    {t('landingEditor.preview', 'VISTA PREVIA')}
                </p>
                <div
                    className="p-4 rounded-lg"
                    style={{
                        backgroundColor: data.backgroundColor || '#000000',
                        borderColor: data.borderColor || '#334155',
                        borderWidth: '1px'
                    }}
                >
                    {/* Nav Links Preview */}
                    <div className="flex gap-4 mb-4 pb-3 border-b border-white/10">
                        {[t('landingEditor.previewNavHome', 'Inicio'), t('landingEditor.previewNavServices', 'Servicios'), t('landingEditor.previewNavContact', 'Contacto')].map((link) => (
                            <span
                                key={link}
                                className="text-sm"
                                style={{
                                    fontFamily: getFontStack(resolveFontFamily(data.headingFont)),
                                    color: data.textColor || '#ffffff',
                                    textTransform: data.navLinksCaps ? 'uppercase' : 'none',
                                    letterSpacing: data.navLinksCaps ? '0.05em' : 'normal'
                                }}
                            >
                                {link}
                            </span>
                        ))}
                    </div>

                    <h3
                        className="text-xl mb-2 font-bold"
                        style={{
                            fontFamily: getFontStack(resolveFontFamily(data.headingFont)),
                            fontWeight: data.headingFontWeight || 700,
                            fontStyle: data.headingFontStyle || 'normal',
                            color: data.headingColor || data.textColor || '#ffffff',
                            textTransform: data.headingsCaps ? 'uppercase' : 'none',
                            letterSpacing: data.headingsCaps ? '0.05em' : 'normal'
                        }}
                    >
                        {t('landingEditor.exampleTitle', 'Título de Ejemplo')}
                    </h3>
                    <p
                        className="text-sm mb-4"
                        style={{
                            fontFamily: getFontStack(resolveFontFamily(data.bodyFont)),
                            fontWeight: data.bodyFontWeight || 400,
                            fontStyle: data.bodyFontStyle || 'normal',
                            color: data.textColor || '#ffffff'
                        }}
                    >
                        {t('landingEditor.exampleBody', 'Este es un párrafo de ejemplo para visualizar cómo se verá el texto del cuerpo en tu sitio web. Una buena tipografía mejora la legibilidad.')}
                    </p>
                    <button
                        className="px-4 py-2 rounded-md text-sm font-medium"
                        style={{
                            fontFamily: getFontStack(resolveFontFamily(data.buttonFont)),
                            fontWeight: data.buttonFontWeight || 600,
                            fontStyle: data.buttonFontStyle || 'normal',
                            backgroundColor: data.mainColor || data.accentColor || '#FF9505',
                            color: '#ffffff',
                            textTransform: data.buttonsCaps ? 'uppercase' : 'none',
                            letterSpacing: data.buttonsCaps ? '0.05em' : 'normal'
                        }}
                    >
                        {t('landingEditor.previewButton', 'TEXTO DEL BOTÓN')}
                    </button>
                </div>
            </div>
        </div>
    );

    // ========================================================================
    // SERVICES CONTROLS
    // ========================================================================
    // Available service icons for the selector
    const serviceIconOptions = [
        // Development & Technology
        { value: 'code', label: 'Código' },
        { value: 'terminal', label: 'Terminal' },
        { value: 'cpu', label: 'CPU' },
        { value: 'database', label: 'Base de Datos' },
        { value: 'server', label: 'Servidor' },
        { value: 'cloud', label: 'Nube' },
        { value: 'globe', label: 'Globo' },
        { value: 'smartphone', label: 'Smartphone' },
        { value: 'monitor', label: 'Monitor' },
        // Design & Creative
        { value: 'brush', label: 'Pincel' },
        { value: 'palette', label: 'Paleta' },
        { value: 'pen-tool', label: 'Pluma' },
        { value: 'layout', label: 'Diseño' },
        { value: 'image', label: 'Imagen' },
        { value: 'camera', label: 'Cámara' },
        { value: 'video', label: 'Video' },
        // Business & Marketing
        { value: 'megaphone', label: 'Megáfono' },
        { value: 'trending-up', label: 'Tendencia' },
        { value: 'chart', label: 'Gráfico' },
        { value: 'bar-chart', label: 'Barras' },
        { value: 'target', label: 'Objetivo' },
        { value: 'briefcase', label: 'Maletín' },
        { value: 'dollar-sign', label: 'Dólar' },
        // Communication
        { value: 'mail', label: 'Correo' },
        { value: 'message-circle', label: 'Mensaje' },
        { value: 'phone', label: 'Teléfono' },
        { value: 'users', label: 'Usuarios' },
        // Tools & Services
        { value: 'wrench', label: 'Llave' },
        { value: 'settings', label: 'Ajustes' },
        { value: 'shopping-cart', label: 'Carrito' },
        { value: 'package', label: 'Paquete' },
        { value: 'truck', label: 'Envío' },
        // Other
        { value: 'zap', label: 'Rayo' },
        { value: 'rocket', label: 'Cohete' },
        { value: 'lightbulb', label: 'Bombilla' },
        { value: 'sparkles', label: 'Destellos' },
        { value: 'shield', label: 'Escudo' },
        { value: 'award', label: 'Premio' },
        { value: 'star', label: 'Estrella' },
        { value: 'heart', label: 'Corazón' },
    ];

    const renderServicesControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    {/* Section Header */}
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder={t('landingEditor.titlePlaceholder', 'Nuestros Servicios')}
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.description', 'Descripción')}>
                        <TextInput
                            value={data.description || ''}
                            onChange={(v) => updateData('description', v)}
                            placeholder={t('landingEditor.descriptionPlaceholder', 'Servicios que ofrecemos')}
                            multiline
                        />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.variant', 'Variante')}>
                        <SelectControl
                            value={data.servicesVariant || 'cards'}
                            onChange={(v) => updateData('servicesVariant', v)}
                            options={[
                                { value: 'cards', label: t('landingEditor.variantCards', 'Tarjetas') },
                                { value: 'grid', label: t('landingEditor.variantGrid', 'Cuadrícula') },
                                { value: 'minimal', label: t('landingEditor.variantMinimal', 'Minimal') },
                            ]}
                        />
                    </ControlGroup>

                    {/* Service Items Management */}
                    <div className="pt-4 border-t border-editor-border">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.serviceItems', 'Servicios')}
                            </label>
                            <button
                                onClick={() => {
                                    const currentItems = data.items || [];
                                    updateData('items', [...currentItems, { title: 'Nuevo Servicio', description: 'Descripción del servicio', icon: 'zap' }]);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-editor-accent hover:bg-editor-accent/10 rounded-md transition-colors"
                            >
                                <Plus size={14} /> {t('landingEditor.addService', 'Añadir')}
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(data.items || []).map((item: any, index: number) => (
                                <div key={index} className="p-3 bg-editor-panel-bg/50 rounded-lg border border-editor-border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-editor-text-secondary">
                                            {t('landingEditor.service', 'Servicio')} #{index + 1}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const newItems = (data.items || []).filter((_: any, i: number) => i !== index);
                                                updateData('items', newItems);
                                            }}
                                            className="text-editor-text-secondary hover:text-destructive transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
                                        <TextInput
                                            value={item.title || ''}
                                            onChange={(v) => {
                                                const newItems = [...(data.items || [])];
                                                newItems[index] = { ...newItems[index], title: v };
                                                updateData('items', newItems);
                                            }}
                                            placeholder={t('landingEditor.serviceTitle', 'Título del servicio')}
                                        />
                                        <TextInput
                                            value={item.description || ''}
                                            onChange={(v) => {
                                                const newItems = [...(data.items || [])];
                                                newItems[index] = { ...newItems[index], description: v };
                                                updateData('items', newItems);
                                            }}
                                            placeholder={t('landingEditor.serviceDescription', 'Descripción del servicio')}
                                            multiline
                                        />
                                        <SelectControl
                                            value={item.icon || 'zap'}
                                            onChange={(v) => {
                                                const newItems = [...(data.items || [])];
                                                newItems[index] = { ...newItems[index], icon: v };
                                                updateData('items', newItems);
                                            }}
                                            options={serviceIconOptions}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    {/* Section Colors */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.sectionColors', 'Colores de Sección')}
                        </label>
                        <ControlGroup label={t('landingEditor.backgroundColor', 'Fondo')}>
                            <ColorControl
                                value={data.colors?.background || '#0f172a'}
                                onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.titleColor', 'Título')}>
                            <ColorControl
                                value={data.colors?.heading || '#f1f5f9'}
                                onChange={(v) => updateData('colors', { ...data.colors, heading: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.descriptionColor', 'Descripción')}>
                            <ColorControl
                                value={data.colors?.description || '#94a3b8'}
                                onChange={(v) => updateData('colors', { ...data.colors, description: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.accentColor', 'Acento')}>
                            <ColorControl
                                value={data.colors?.accent || '#6366f1'}
                                onChange={(v) => updateData('colors', { ...data.colors, accent: v })}
                            />
                        </ControlGroup>
                    </div>

                    {/* Card Colors */}
                    <div className="space-y-3 pt-4 border-t border-editor-border">
                        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.cardColors', 'Colores de Tarjetas')}
                        </label>
                        <ControlGroup label={t('landingEditor.cardBackground', 'Fondo de Tarjeta')}>
                            <ColorControl
                                value={data.colors?.cardBackground || '#1e293b'}
                                onChange={(v) => updateData('colors', { ...data.colors, cardBackground: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.cardTitle', 'Título de Tarjeta')}>
                            <ColorControl
                                value={data.colors?.cardHeading || '#ffffff'}
                                onChange={(v) => updateData('colors', { ...data.colors, cardHeading: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.cardText', 'Texto de Tarjeta')}>
                            <ColorControl
                                value={data.colors?.cardText || '#94a3b8'}
                                onChange={(v) => updateData('colors', { ...data.colors, cardText: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.borderColor', 'Color de Borde')}>
                            <ColorControl
                                value={data.colors?.borderColor || '#334155'}
                                onChange={(v) => updateData('colors', { ...data.colors, borderColor: v })}
                            />
                        </ControlGroup>
                    </div>

                    {/* Spacing */}
                    <div className="space-y-3 pt-4 border-t border-editor-border">
                        <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.spacing', 'Espaciado')}
                        </label>
                        <ControlGroup label={t('landingEditor.paddingY', 'Vertical')}>
                            <SelectControl
                                value={data.paddingY || 'lg'}
                                onChange={(v) => updateData('paddingY', v)}
                                options={[
                                    { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                    { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                    { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                ]}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.paddingX', 'Horizontal')}>
                            <SelectControl
                                value={data.paddingX || 'lg'}
                                onChange={(v) => updateData('paddingX', v)}
                                options={[
                                    { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                    { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                    { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                ]}
                            />
                        </ControlGroup>
                    </div>
                </>
            )}
        </div>
    );

    // ========================================================================
    // PORTFOLIO CONTROLS (Complete - Matching Web Editor)
    // ========================================================================
    const renderPortfolioControls = () => {
        const currentPortfolioVariant = data.portfolioVariant || 'classic';

        return (
            <div className="space-y-4">
                {activeTab === 'content' && (
                    <>
                        {/* Title & Description */}
                        <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                            <TextInput
                                value={data.title || ''}
                                onChange={(v) => updateData('title', v)}
                                placeholder={t('landingEditor.portfolioTitle', 'Nuestro Portfolio')}
                            />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.titleSize', 'Tamaño del Título')}>
                            <SelectControl
                                value={data.titleFontSize || 'md'}
                                onChange={(v) => updateData('titleFontSize', v)}
                                options={[
                                    { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                    { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                    { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                    { value: 'xl', label: t('landingEditor.extraLarge', 'Extra Grande') },
                                ]}
                            />
                        </ControlGroup>

                        <ControlGroup label={t('landingEditor.description', 'Descripción')}>
                            <TextInput
                                value={data.description || ''}
                                onChange={(v) => updateData('description', v)}
                                placeholder={t('landingEditor.portfolioDesc', 'Proyectos destacados')}
                                multiline
                            />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.descriptionSize', 'Tamaño de Descripción')}>
                            <SelectControl
                                value={data.descriptionFontSize || 'md'}
                                onChange={(v) => updateData('descriptionFontSize', v)}
                                options={[
                                    { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                    { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                    { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                ]}
                            />
                        </ControlGroup>

                        {/* Variant Selector */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                            <ControlGroup label={t('landingEditor.portfolioStyle', 'Estilo de Portfolio')}>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => updateData('portfolioVariant', 'classic')}
                                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${currentPortfolioVariant === 'classic'
                                            ? 'bg-editor-accent text-editor-bg border-editor-accent'
                                            : 'bg-editor-panel-bg/50 text-editor-text-secondary border-editor-border hover:border-editor-accent'
                                            }`}
                                    >
                                        📦 {t('landingEditor.variantClassic', 'Clásico')}
                                    </button>
                                    <button
                                        onClick={() => updateData('portfolioVariant', 'image-overlay')}
                                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${currentPortfolioVariant === 'image-overlay'
                                            ? 'bg-editor-accent text-editor-bg border-editor-accent'
                                            : 'bg-editor-panel-bg/50 text-editor-text-secondary border-editor-border hover:border-editor-accent'
                                            }`}
                                    >
                                        🖼️ {t('landingEditor.variantOverlay', 'Overlay')}
                                    </button>
                                </div>
                                <p className="text-xs text-editor-text-secondary mt-2">
                                    {currentPortfolioVariant === 'classic'
                                        ? t('landingEditor.classicDesc', '📦 Diseño de tarjetas en cuadrícula')
                                        : t('landingEditor.overlayDesc', '🖼️ Imágenes con texto superpuesto')}
                                </p>
                            </ControlGroup>
                        </div>

                        {/* Overlay-specific controls */}
                        {currentPortfolioVariant === 'image-overlay' && (
                            <div className="space-y-4 p-3 bg-editor-panel-bg/50 rounded-lg border border-editor-border">
                                <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                    {t('landingEditor.overlaySettings', 'Configuración Overlay')}
                                </h4>

                                {/* Grid Columns */}
                                <ControlGroup label={t('landingEditor.gridColumns', 'Columnas')}>
                                    <div className="flex gap-2">
                                        {[2, 3, 4].map(cols => (
                                            <button
                                                key={cols}
                                                onClick={() => updateData('gridColumns', cols)}
                                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${(data.gridColumns || 3) === cols
                                                    ? 'bg-editor-accent text-editor-bg'
                                                    : 'bg-editor-panel-bg/50 text-editor-text-secondary hover:bg-editor-bg'
                                                    }`}
                                            >
                                                {cols}
                                            </button>
                                        ))}
                                    </div>
                                </ControlGroup>

                                {/* Image Height */}
                                <ControlGroup label={`${t('landingEditor.imageHeight', 'Altura de Imagen')}: ${data.imageHeight || 300}px`}>
                                    <input
                                        type="range"
                                        min="150"
                                        max="600"
                                        step="10"
                                        value={data.imageHeight || 300}
                                        onChange={(e) => updateData('imageHeight', parseInt(e.target.value, 10))}
                                        className="w-full h-2 bg-editor-panel-bg rounded-lg appearance-none cursor-pointer"
                                    />
                                </ControlGroup>

                                {/* Text Alignment */}
                                <ControlGroup label={t('landingEditor.textAlignment', 'Alineación de Texto')}>
                                    <div className="flex gap-2">
                                        {(['left', 'center', 'right'] as const).map(align => (
                                            <button
                                                key={align}
                                                onClick={() => updateData('overlayTextAlignment', align)}
                                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${(data.overlayTextAlignment || 'left') === align
                                                    ? 'bg-editor-accent text-editor-bg'
                                                    : 'bg-editor-panel-bg/50 text-editor-text-secondary hover:bg-editor-bg'
                                                    }`}
                                            >
                                                {align === 'left' ? '⬅️' : align === 'center' ? '↔️' : '➡️'}
                                            </button>
                                        ))}
                                    </div>
                                </ControlGroup>

                                {/* Show Section Header */}
                                <Toggle
                                    label={t('landingEditor.showSectionHeader', 'Mostrar Encabezado')}
                                    checked={data.showSectionHeader !== false}
                                    onChange={(v) => updateData('showSectionHeader', v)}
                                />
                            </div>
                        )}

                        {/* Projects List */}
                        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3">
                                {t('landingEditor.projects', 'Proyectos')} ({(data.items || []).length})
                            </h4>

                            <div className="space-y-3">
                                {(data.items || []).map((item: any, index: number) => (
                                    <div key={index} className="p-3 bg-editor-panel-bg/20 rounded-lg border border-editor-border">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-editor-text-secondary">
                                                {t('landingEditor.project', 'Proyecto')} #{index + 1}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const newItems = (data.items || []).filter((_: any, i: number) => i !== index);
                                                    updateData('items', newItems);
                                                }}
                                                className="text-editor-text-secondary hover:text-destructive transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <ImagePicker
                                            label={t('landingEditor.image', 'Imagen')}
                                            value={item.imageUrl || ''}
                                            onChange={(url) => {
                                                const newItems = [...(data.items || [])];
                                                newItems[index] = { ...newItems[index], imageUrl: url };
                                                updateData('items', newItems);
                                            }}
                                        />

                                        <div className="mt-2">
                                            <input
                                                placeholder={t('landingEditor.projectTitle', 'Título del proyecto')}
                                                value={item.title || ''}
                                                onChange={(e) => {
                                                    const newItems = [...(data.items || [])];
                                                    newItems[index] = { ...newItems[index], title: e.target.value };
                                                    updateData('items', newItems);
                                                }}
                                                className="w-full bg-editor-bg border border-editor-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent mb-2"
                                            />
                                            <textarea
                                                placeholder={t('landingEditor.projectDescription', 'Descripción del proyecto')}
                                                value={item.description || ''}
                                                onChange={(e) => {
                                                    const newItems = [...(data.items || [])];
                                                    newItems[index] = { ...newItems[index], description: e.target.value };
                                                    updateData('items', newItems);
                                                }}
                                                rows={2}
                                                className="w-full bg-editor-bg border border-editor-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-editor-accent resize-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    const newItems = [...(data.items || []), {
                                        title: t('landingEditor.newProject', 'Nuevo Proyecto'),
                                        description: t('landingEditor.projectDescPlaceholder', 'Descripción del proyecto'),
                                        imageUrl: ''
                                    }];
                                    updateData('items', newItems);
                                }}
                                className="w-full mt-3 py-2.5 px-4 rounded-lg border border-dashed border-editor-accent/50 text-editor-accent text-sm font-medium hover:bg-editor-accent/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                {t('landingEditor.addProject', 'Añadir Proyecto')}
                            </button>
                        </div>
                    </>
                )}

                {activeTab === 'style' && (
                    <>
                        {/* Section Colors */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.sectionColors', 'Colores de Sección')}
                            </h4>
                            <ControlGroup label={t('landingEditor.backgroundColor', 'Fondo')}>
                                <ColorControl
                                    value={data.colors?.background || '#0f172a'}
                                    onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                                />
                            </ControlGroup>
                            <ControlGroup label={t('landingEditor.headingColor', 'Encabezado')}>
                                <ColorControl
                                    value={data.colors?.heading || '#F9FAFB'}
                                    onChange={(v) => updateData('colors', { ...data.colors, heading: v })}
                                />
                            </ControlGroup>
                            <ControlGroup label={t('landingEditor.textColor', 'Texto')}>
                                <ColorControl
                                    value={data.colors?.text || '#94a3b8'}
                                    onChange={(v) => updateData('colors', { ...data.colors, text: v })}
                                />
                            </ControlGroup>
                            <ControlGroup label={t('landingEditor.accentColor', 'Acento')}>
                                <ColorControl
                                    value={data.colors?.accent || '#4f46e5'}
                                    onChange={(v) => updateData('colors', { ...data.colors, accent: v })}
                                />
                            </ControlGroup>
                        </div>

                        {/* Corner Gradient */}
                        <div className="border-t border-editor-border pt-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                    {t('landingEditor.cornerGradient', 'Gradiente de Esquina')}
                                </h4>
                                <Toggle
                                    label=""
                                    checked={data.cornerGradient?.enabled || false}
                                    onChange={(v) => updateData('cornerGradient', { ...data.cornerGradient, enabled: v })}
                                />
                            </div>
                            {data.cornerGradient?.enabled && (
                                <>
                                    <ControlGroup label={t('landingEditor.position', 'Posición')}>
                                        <SelectControl
                                            value={data.cornerGradient?.position || 'top-left'}
                                            onChange={(v) => updateData('cornerGradient', { ...data.cornerGradient, position: v })}
                                            options={[
                                                { value: 'top-left', label: t('landingEditor.topLeft', 'Superior Izq.') },
                                                { value: 'top-right', label: t('landingEditor.topRight', 'Superior Der.') },
                                                { value: 'bottom-left', label: t('landingEditor.bottomLeft', 'Inferior Izq.') },
                                                { value: 'bottom-right', label: t('landingEditor.bottomRight', 'Inferior Der.') },
                                            ]}
                                        />
                                    </ControlGroup>
                                    <ControlGroup label={t('landingEditor.color', 'Color')}>
                                        <ColorControl
                                            value={data.cornerGradient?.color || '#4f46e5'}
                                            onChange={(v) => updateData('cornerGradient', { ...data.cornerGradient, color: v })}
                                        />
                                    </ControlGroup>
                                    <ControlGroup label={`${t('landingEditor.opacity', 'Opacidad')}: ${data.cornerGradient?.opacity || 30}%`}>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={data.cornerGradient?.opacity || 30}
                                            onChange={(e) => updateData('cornerGradient', { ...data.cornerGradient, opacity: parseInt(e.target.value, 10) })}
                                            className="w-full h-2 bg-editor-panel-bg rounded-lg appearance-none cursor-pointer"
                                        />
                                    </ControlGroup>
                                    <ControlGroup label={`${t('landingEditor.size', 'Tamaño')}: ${data.cornerGradient?.size || 50}%`}>
                                        <input
                                            type="range"
                                            min="10"
                                            max="100"
                                            value={data.cornerGradient?.size || 50}
                                            onChange={(e) => updateData('cornerGradient', { ...data.cornerGradient, size: parseInt(e.target.value, 10) })}
                                            className="w-full h-2 bg-editor-panel-bg rounded-lg appearance-none cursor-pointer"
                                        />
                                    </ControlGroup>
                                </>
                            )}
                        </div>

                        {/* Card Colors */}
                        <div className="border-t border-editor-border pt-4 space-y-3">
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.cardColors', 'Colores de Tarjeta')}
                            </h4>
                            <ControlGroup label={t('landingEditor.cardBackground', 'Fondo de Tarjeta')}>
                                <ColorControl
                                    value={data.colors?.cardBackground || 'rgba(0,0,0,0.8)'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardBackground: v })}
                                />
                            </ControlGroup>
                            <ControlGroup label={t('landingEditor.cardTitle', 'Título de Tarjeta')}>
                                <ColorControl
                                    value={data.colors?.cardTitleColor || '#ffffff'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardTitleColor: v })}
                                />
                            </ControlGroup>
                            <ControlGroup label={t('landingEditor.cardText', 'Texto de Tarjeta')}>
                                <ColorControl
                                    value={data.colors?.cardTextColor || 'rgba(255,255,255,0.9)'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardTextColor: v })}
                                />
                            </ControlGroup>
                            <ControlGroup label={t('landingEditor.borderColor', 'Color de Borde')}>
                                <ColorControl
                                    value={data.colors?.borderColor || '#334155'}
                                    onChange={(v) => updateData('colors', { ...data.colors, borderColor: v })}
                                />
                            </ControlGroup>
                        </div>

                        {/* Card Overlay Gradient */}
                        <div className="border-t border-editor-border pt-4 space-y-3">
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.cardOverlayGradient', 'Gradiente Overlay')}
                            </h4>
                            <ControlGroup label={t('landingEditor.overlayStart', 'Inicio')}>
                                <ColorControl
                                    value={data.colors?.cardOverlayStart || 'rgba(0,0,0,0.9)'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardOverlayStart: v })}
                                />
                            </ControlGroup>
                            <ControlGroup label={t('landingEditor.overlayEnd', 'Fin')}>
                                <ColorControl
                                    value={data.colors?.cardOverlayEnd || 'rgba(0,0,0,0.2)'}
                                    onChange={(v) => updateData('colors', { ...data.colors, cardOverlayEnd: v })}
                                />
                            </ControlGroup>
                        </div>

                        {/* Spacing */}
                        <div className="border-t border-editor-border pt-4 space-y-3">
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.spacing', 'Espaciado')}
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <ControlGroup label={t('landingEditor.paddingY', 'Vertical')}>
                                    <SelectControl
                                        value={data.paddingY || 'md'}
                                        onChange={(v) => updateData('paddingY', v)}
                                        options={[
                                            { value: 'none', label: t('landingEditor.none', 'Ninguno') },
                                            { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                            { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                            { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                            { value: 'xl', label: t('landingEditor.extraLarge', 'Extra Grande') },
                                        ]}
                                    />
                                </ControlGroup>
                                <ControlGroup label={t('landingEditor.paddingX', 'Horizontal')}>
                                    <SelectControl
                                        value={data.paddingX || 'md'}
                                        onChange={(v) => updateData('paddingX', v)}
                                        options={[
                                            { value: 'none', label: t('landingEditor.none', 'Ninguno') },
                                            { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                            { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                            { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                        ]}
                                    />
                                </ControlGroup>
                            </div>
                        </div>

                        {/* Animations */}
                        <div className="border-t border-editor-border pt-4 space-y-3">
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.animations', 'Animaciones')}
                            </h4>
                            <Toggle
                                label={t('landingEditor.enableCardAnimation', 'Habilitar Animaciones')}
                                checked={data.enableCardAnimation !== false}
                                onChange={(v) => updateData('enableCardAnimation', v)}
                            />
                            {data.enableCardAnimation !== false && (
                                <ControlGroup label={t('landingEditor.animationType', 'Tipo de Animación')}>
                                    <SelectControl
                                        value={data.animationType || 'fade-in-up'}
                                        onChange={(v) => updateData('animationType', v)}
                                        options={[
                                            { value: 'fade-in-up', label: t('landingEditor.fadeInUp', 'Aparecer arriba') },
                                            { value: 'fade-in', label: t('landingEditor.fadeIn', 'Aparecer') },
                                            { value: 'scale-in', label: t('landingEditor.scaleIn', 'Escalar') },
                                            { value: 'slide-in-left', label: t('landingEditor.slideInLeft', 'Deslizar izq.') },
                                            { value: 'slide-in-right', label: t('landingEditor.slideInRight', 'Deslizar der.') },
                                        ]}
                                    />
                                </ControlGroup>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    // ========================================================================
    // TEAM CONTROLS
    // ========================================================================
    const renderTeamControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder={t('landingEditor.teamTitle', 'Nuestro Equipo')}
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.description', 'Descripción')}>
                        <TextInput
                            value={data.description || ''}
                            onChange={(v) => updateData('description', v)}
                            placeholder={t('landingEditor.teamDesc', 'Conoce al equipo')}
                            multiline
                        />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.variant', 'Variante')}>
                        <SelectControl
                            value={data.teamVariant || 'classic'}
                            onChange={(v) => updateData('teamVariant', v)}
                            options={[
                                { value: 'classic', label: t('landingEditor.variantClassic', 'Clásico') },
                                { value: 'cards', label: t('landingEditor.variantCards', 'Tarjetas') },
                                { value: 'minimal', label: t('landingEditor.variantMinimal', 'Minimal') },
                                { value: 'overlay', label: t('landingEditor.variantOverlay', 'Overlay') },
                            ]}
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <ControlGroup label={t('landingEditor.paddingY', 'Espaciado Vertical')}>
                        <SelectControl
                            value={data.paddingY || 'lg'}
                            onChange={(v) => updateData('paddingY', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                            ]}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.backgroundColor', 'Color de Fondo')}>
                        <ColorControl
                            value={data.colors?.background || '#0f172a'}
                            onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.accentColor', 'Color de Acento')}>
                        <ColorControl
                            value={data.colors?.accent || '#6366f1'}
                            onChange={(v) => updateData('colors', { ...data.colors, accent: v })}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // LEADS/CONTACT FORM CONTROLS
    // ========================================================================
    const renderLeadsControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    {/* Variant Selector */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
                            {t('landingEditor.formStyle', 'Estilo de Formulario')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: 'classic', label: t('landingEditor.variantClassic', 'Clásico') },
                                { value: 'split-gradient', label: t('landingEditor.variantSplitGradient', 'Gradiente Dividido') },
                                { value: 'floating-glass', label: t('landingEditor.variantFloatingGlass', 'Vidrio Flotante') },
                                { value: 'minimal-border', label: t('landingEditor.variantMinimalBorder', 'Borde Minimalista') }
                            ].map((variant) => (
                                <button
                                    key={variant.value}
                                    onClick={() => updateData('leadsVariant', variant.value)}
                                    className={`p-3 text-xs font-medium rounded-md border-2 transition-all ${(data.leadsVariant || 'classic') === variant.value
                                        ? 'bg-editor-accent text-editor-bg border-editor-accent'
                                        : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:border-editor-accent'
                                        }`}
                                >
                                    {variant.label}
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* Content */}
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder={t('landingEditor.leadsTitle', 'Contáctanos')}
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.titleSize', 'Tamaño del Título')}>
                        <SelectControl
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                { value: 'xl', label: t('landingEditor.extraLarge', 'Extra Grande') },
                            ]}
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.description', 'Descripción')}>
                        <TextInput
                            value={data.description || ''}
                            onChange={(v) => updateData('description', v)}
                            placeholder={t('landingEditor.leadsDesc', 'Estamos aquí para ayudarte')}
                            multiline
                        />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.descriptionSize', 'Tamaño de Descripción')}>
                        <SelectControl
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                            ]}
                        />
                    </ControlGroup>

                    <ControlGroup label={t('landingEditor.buttonText', 'Texto del Botón')}>
                        <TextInput
                            value={data.buttonText || ''}
                            onChange={(v) => updateData('buttonText', v)}
                            placeholder={t('landingEditor.sendMessage', 'Enviar Mensaje')}
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    {/* Border Radius Controls */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.borderRadius', 'Radio de Borde')}
                        </h4>
                        <ControlGroup label={t('landingEditor.cardRadius', 'Radio de Tarjeta')}>
                            <SelectControl
                                value={data.cardBorderRadius || 'xl'}
                                onChange={(v) => updateData('cardBorderRadius', v)}
                                options={[
                                    { value: 'none', label: t('landingEditor.none', 'Ninguno') },
                                    { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                    { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                    { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                    { value: 'xl', label: t('landingEditor.extraLarge', 'Extra Grande') },
                                    { value: '2xl', label: '2XL' },
                                ]}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.inputRadius', 'Radio de Input')}>
                            <SelectControl
                                value={data.inputBorderRadius || 'md'}
                                onChange={(v) => updateData('inputBorderRadius', v)}
                                options={[
                                    { value: 'none', label: t('landingEditor.none', 'Ninguno') },
                                    { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                    { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                    { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                ]}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.buttonRadius', 'Radio de Botón')}>
                            <SelectControl
                                value={data.buttonBorderRadius || 'md'}
                                onChange={(v) => updateData('buttonBorderRadius', v)}
                                options={[
                                    { value: 'none', label: t('landingEditor.none', 'Ninguno') },
                                    { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                    { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                    { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                    { value: 'full', label: t('landingEditor.full', 'Completo') },
                                ]}
                            />
                        </ControlGroup>
                    </div>


                    {/* Spacing */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.spacing', 'Espaciado')}
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <ControlGroup label={t('landingEditor.paddingY', 'Vertical')}>
                                <SelectControl
                                    value={data.paddingY || 'lg'}
                                    onChange={(v) => updateData('paddingY', v)}
                                    options={[
                                        { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                        { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                        { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                        { value: 'xl', label: t('landingEditor.extraLarge', 'Extra Grande') },
                                    ]}
                                />
                            </ControlGroup>
                            <ControlGroup label={t('landingEditor.paddingX', 'Horizontal')}>
                                <SelectControl
                                    value={data.paddingX || 'md'}
                                    onChange={(v) => updateData('paddingX', v)}
                                    options={[
                                        { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                        { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                        { value: 'lg', label: t('landingEditor.large', 'Grande') },
                                    ]}
                                />
                            </ControlGroup>
                        </div>
                    </div>


                    {/* Section Colors */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.sectionColors', 'Colores de Sección')}
                        </h4>
                        <ControlGroup label={t('landingEditor.backgroundColor', 'Fondo')}>
                            <ColorControl
                                value={data.colors?.background || '#0f172a'}
                                onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.headingColor', 'Título')}>
                            <ColorControl
                                value={data.colors?.heading || '#F9FAFB'}
                                onChange={(v) => updateData('colors', { ...data.colors, heading: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.descriptionColor', 'Descripción')}>
                            <ColorControl
                                value={data.colors?.description || '#94a3b8'}
                                onChange={(v) => updateData('colors', { ...data.colors, description: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.accentColor', 'Acento')}>
                            <ColorControl
                                value={data.colors?.accent || '#4f46e5'}
                                onChange={(v) => updateData('colors', { ...data.colors, accent: v })}
                            />
                        </ControlGroup>
                    </div>


                    {/* Corner Gradient */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                                {t('landingEditor.cornerGradient', 'Gradiente de Esquina')}
                            </h4>
                            <Toggle
                                label=""
                                checked={data.cornerGradient?.enabled || false}
                                onChange={(v) => updateData('cornerGradient', { ...data.cornerGradient, enabled: v })}
                            />
                        </div>
                        {data.cornerGradient?.enabled && (
                            <>
                                <ControlGroup label={t('landingEditor.position', 'Posición')}>
                                    <SelectControl
                                        value={data.cornerGradient?.position || 'top-left'}
                                        onChange={(v) => updateData('cornerGradient', { ...data.cornerGradient, position: v })}
                                        options={[
                                            { value: 'top-left', label: t('landingEditor.topLeft', 'Superior Izq.') },
                                            { value: 'top-right', label: t('landingEditor.topRight', 'Superior Der.') },
                                            { value: 'bottom-left', label: t('landingEditor.bottomLeft', 'Inferior Izq.') },
                                            { value: 'bottom-right', label: t('landingEditor.bottomRight', 'Inferior Der.') },
                                        ]}
                                    />
                                </ControlGroup>
                                <ControlGroup label={t('landingEditor.color', 'Color')}>
                                    <ColorControl
                                        value={data.cornerGradient?.color || '#4f46e5'}
                                        onChange={(v) => updateData('cornerGradient', { ...data.cornerGradient, color: v })}
                                    />
                                </ControlGroup>
                                <ControlGroup label={`${t('landingEditor.opacity', 'Opacidad')}: ${data.cornerGradient?.opacity || 30}%`}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={data.cornerGradient?.opacity || 30}
                                        onChange={(e) => updateData('cornerGradient', { ...data.cornerGradient, opacity: parseInt(e.target.value, 10) })}
                                        className="w-full h-2 bg-editor-panel-bg rounded-lg appearance-none cursor-pointer"
                                    />
                                </ControlGroup>
                                <ControlGroup label={`${t('landingEditor.size', 'Tamaño')}: ${data.cornerGradient?.size || 50}%`}>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        value={data.cornerGradient?.size || 50}
                                        onChange={(e) => updateData('cornerGradient', { ...data.cornerGradient, size: parseInt(e.target.value, 10) })}
                                        className="w-full h-2 bg-editor-panel-bg rounded-lg appearance-none cursor-pointer"
                                    />
                                </ControlGroup>
                            </>
                        )}
                    </div>


                    {/* Card Colors */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.cardColors', 'Colores de Tarjeta')}
                        </h4>
                        <ControlGroup label={t('landingEditor.cardBackground', 'Fondo de Tarjeta')}>
                            <ColorControl
                                value={data.colors?.cardBackground || '#1e293b'}
                                onChange={(v) => updateData('colors', { ...data.colors, cardBackground: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.labelText', 'Texto de Etiqueta')}>
                            <ColorControl
                                value={data.colors?.text || '#94a3b8'}
                                onChange={(v) => updateData('colors', { ...data.colors, text: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.borderColor', 'Color de Borde')}>
                            <ColorControl
                                value={data.colors?.borderColor || '#334155'}
                                onChange={(v) => updateData('colors', { ...data.colors, borderColor: v })}
                            />
                        </ControlGroup>
                    </div>


                    {/* Input Colors */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.inputColors', 'Colores de Input')}
                        </h4>
                        <ControlGroup label={t('landingEditor.inputBackground', 'Fondo de Input')}>
                            <ColorControl
                                value={data.colors?.inputBackground || '#0f172a'}
                                onChange={(v) => updateData('colors', { ...data.colors, inputBackground: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.inputText', 'Texto de Input')}>
                            <ColorControl
                                value={data.colors?.inputText || '#F9FAFB'}
                                onChange={(v) => updateData('colors', { ...data.colors, inputText: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.placeholder', 'Placeholder')}>
                            <ColorControl
                                value={data.colors?.inputPlaceholder || '#6b7280'}
                                onChange={(v) => updateData('colors', { ...data.colors, inputPlaceholder: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.inputBorder', 'Borde de Input')}>
                            <ColorControl
                                value={data.colors?.inputBorder || '#334155'}
                                onChange={(v) => updateData('colors', { ...data.colors, inputBorder: v })}
                            />
                        </ControlGroup>
                    </div>


                    {/* Button & Gradient Colors */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">
                            {t('landingEditor.buttonAndGradient', 'Botón y Gradiente')}
                        </h4>
                        <ControlGroup label={t('landingEditor.buttonBackground', 'Fondo de Botón')}>
                            <ColorControl
                                value={data.colors?.buttonBackground || '#4f46e5'}
                                onChange={(v) => updateData('colors', { ...data.colors, buttonBackground: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.buttonText', 'Texto de Botón')}>
                            <ColorControl
                                value={data.colors?.buttonText || '#ffffff'}
                                onChange={(v) => updateData('colors', { ...data.colors, buttonText: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.gradientStart', 'Inicio de Gradiente')}>
                            <ColorControl
                                value={data.colors?.gradientStart || '#4f46e5'}
                                onChange={(v) => updateData('colors', { ...data.colors, gradientStart: v })}
                            />
                        </ControlGroup>
                        <ControlGroup label={t('landingEditor.gradientEnd', 'Fin de Gradiente')}>
                            <ColorControl
                                value={data.colors?.gradientEnd || '#10b981'}
                                onChange={(v) => updateData('colors', { ...data.colors, gradientEnd: v })}
                            />
                        </ControlGroup>
                    </div>
                </>
            )}
        </div>
    );

    // ========================================================================
    // NEWSLETTER CONTROLS
    // ========================================================================
    const renderNewsletterControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder={t('landingEditor.newsletterTitle', 'Suscríbete')}
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.description', 'Descripción')}>
                        <TextInput
                            value={data.description || ''}
                            onChange={(v) => updateData('description', v)}
                            placeholder={t('landingEditor.newsletterDesc', 'Recibe noticias y actualizaciones')}
                            multiline
                        />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.buttonText', 'Texto del Botón')}>
                        <TextInput
                            value={data.buttonText || ''}
                            onChange={(v) => updateData('buttonText', v)}
                            placeholder={t('landingEditor.subscribe', 'Suscribirse')}
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    {/* Spacing */}
                    <ControlGroup label={t('landingEditor.paddingY', 'Espaciado Vertical')}>
                        <SelectControl
                            value={data.paddingY || 'lg'}
                            onChange={(v) => updateData('paddingY', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                            ]}
                        />
                    </ControlGroup>

                    {/* Section Colors */}
                    <ControlGroup label={t('landingEditor.sectionColors', 'Colores de Sección')}>
                        <ColorControl
                            label={t('landingEditor.backgroundColor', 'Fondo')}
                            value={data.colors?.background || '#000000'}
                            onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                        />
                        <ColorControl
                            label={t('landingEditor.headingColor', 'Título de Sección')}
                            value={data.colors?.heading || '#F9FAFB'}
                            onChange={(v) => updateData('colors', { ...data.colors, heading: v })}
                        />
                        <ColorControl
                            label={t('landingEditor.descriptionColor', 'Descripción de Sección')}
                            value={data.colors?.text || '#94a3b8'}
                            onChange={(v) => updateData('colors', { ...data.colors, text: v })}
                        />
                    </ControlGroup>

                    {/* Card Box */}
                    <ControlGroup label={t('landingEditor.cardBox', 'Caja de Tarjeta')}>
                        <ColorControl
                            label={t('landingEditor.cardBackground', 'Fondo de Tarjeta')}
                            value={data.colors?.cardBackground || 'rgba(79, 70, 229, 0.75)'}
                            onChange={(v) => updateData('colors', { ...data.colors, cardBackground: v })}
                        />
                        <ColorControl
                            label={t('landingEditor.borderColor', 'Borde de Tarjeta')}
                            value={data.colors?.borderColor || '#374151'}
                            onChange={(v) => updateData('colors', { ...data.colors, borderColor: v })}
                        />
                        <ColorControl
                            label={t('landingEditor.cardHeading', 'Título de Tarjeta')}
                            value={data.colors?.cardHeading || '#ffffff'}
                            onChange={(v) => updateData('colors', { ...data.colors, cardHeading: v })}
                        />
                        <ColorControl
                            label={t('landingEditor.cardText', 'Texto de Tarjeta')}
                            value={data.colors?.cardText || '#ffffff'}
                            onChange={(v) => updateData('colors', { ...data.colors, cardText: v })}
                        />
                    </ControlGroup>

                    {/* Input Field */}
                    <ControlGroup label={t('landingEditor.inputColors', 'Colores de Input')}>
                        <ColorControl
                            label={t('landingEditor.inputBackground', 'Fondo de Input')}
                            value={data.colors?.inputBackground || '#111827'}
                            onChange={(v) => updateData('colors', { ...data.colors, inputBackground: v })}
                        />
                        <ColorControl
                            label={t('landingEditor.inputText', 'Texto de Input')}
                            value={data.colors?.inputText || '#ffffff'}
                            onChange={(v) => updateData('colors', { ...data.colors, inputText: v })}
                        />
                        <ColorControl
                            label={t('landingEditor.placeholder', 'Placeholder')}
                            value={data.colors?.inputPlaceholder || '#6b7280'}
                            onChange={(v) => updateData('colors', { ...data.colors, inputPlaceholder: v })}
                        />
                        <ColorControl
                            label={t('landingEditor.inputBorder', 'Borde de Input')}
                            value={data.colors?.inputBorder || '#374151'}
                            onChange={(v) => updateData('colors', { ...data.colors, inputBorder: v })}
                        />
                    </ControlGroup>

                    {/* Button */}
                    <ControlGroup label={t('landingEditor.buttonColors', 'Colores de Botón')}>
                        <ColorControl
                            label={t('landingEditor.buttonBackground', 'Fondo de Botón')}
                            value={data.colors?.buttonBackground || '#4f46e5'}
                            onChange={(v) => updateData('colors', { ...data.colors, buttonBackground: v })}
                        />
                        <ColorControl
                            label={t('landingEditor.buttonText', 'Texto de Botón')}
                            value={data.colors?.buttonText || '#ffffff'}
                            onChange={(v) => updateData('colors', { ...data.colors, buttonText: v })}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // VIDEO CONTROLS
    // ========================================================================
    const renderVideoControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder={t('landingEditor.videoTitle', 'Video')}
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.videoUrl', 'URL del Video')}>
                        <TextInput
                            value={data.videoUrl || ''}
                            onChange={(v) => updateData('videoUrl', v)}
                            placeholder="https://youtube.com/watch?v=..."
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.description', 'Descripción')}>
                        <TextInput
                            value={data.description || ''}
                            onChange={(v) => updateData('description', v)}
                            placeholder={t('landingEditor.videoDesc', 'Descripción del video')}
                            multiline
                        />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <ControlGroup label={t('landingEditor.paddingY', 'Espaciado Vertical')}>
                        <SelectControl
                            value={data.paddingY || 'lg'}
                            onChange={(v) => updateData('paddingY', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                            ]}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.backgroundColor', 'Color de Fondo')}>
                        <ColorControl
                            value={data.colors?.background || '#0f172a'}
                            onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // SLIDESHOW/CAROUSEL CONTROLS
    // ========================================================================
    const renderSlideshowControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder={t('landingEditor.slideshowTitle', 'Galería')}
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.variant', 'Variante')}>
                        <SelectControl
                            value={data.slideshowVariant || 'classic'}
                            onChange={(v) => updateData('slideshowVariant', v)}
                            options={[
                                { value: 'classic', label: t('landingEditor.variantClassic', 'Clásico') },
                                { value: 'kenburns', label: 'Ken Burns' },
                                { value: 'cards3d', label: '3D Cards' },
                                { value: 'thumbnails', label: t('landingEditor.thumbnails', 'Miniaturas') },
                            ]}
                        />
                    </ControlGroup>
                    <Toggle
                        label={t('landingEditor.showArrows', 'Mostrar Flechas')}
                        checked={data.showArrows !== false}
                        onChange={(v) => updateData('showArrows', v)}
                    />
                    <Toggle
                        label={t('landingEditor.showDots', 'Mostrar Indicadores')}
                        checked={data.showDots !== false}
                        onChange={(v) => updateData('showDots', v)}
                    />
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <ControlGroup label={t('landingEditor.autoPlaySpeed', 'Velocidad Auto-play (ms)')}>
                        <RangeControl
                            value={data.autoPlaySpeed || 5000}
                            onChange={(v) => updateData('autoPlaySpeed', v)}
                            min={2000}
                            max={10000}
                            step={500}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.paddingY', 'Espaciado Vertical')}>
                        <SelectControl
                            value={data.paddingY || 'lg'}
                            onChange={(v) => updateData('paddingY', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                            ]}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.backgroundColor', 'Color de Fondo')}>
                        <ColorControl
                            value={data.colors?.background || '#1e293b'}
                            onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // HOW IT WORKS CONTROLS
    // ========================================================================
    const renderHowItWorksControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder={t('landingEditor.howItWorksTitle', '¿Cómo Funciona?')}
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.description', 'Descripción')}>
                        <TextInput
                            value={data.description || ''}
                            onChange={(v) => updateData('description', v)}
                            placeholder={t('landingEditor.howItWorksDesc', 'Pasos simples')}
                            multiline
                        />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <ControlGroup label={t('landingEditor.paddingY', 'Espaciado Vertical')}>
                        <SelectControl
                            value={data.paddingY || 'lg'}
                            onChange={(v) => updateData('paddingY', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                            ]}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.backgroundColor', 'Color de Fondo')}>
                        <ColorControl
                            value={data.colors?.background || '#0f172a'}
                            onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.accentColor', 'Color de Acento')}>
                        <ColorControl
                            value={data.colors?.accent || '#6366f1'}
                            onChange={(v) => updateData('colors', { ...data.colors, accent: v })}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // MAP CONTROLS
    // ========================================================================
    const renderMapControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder={t('landingEditor.mapTitle', 'Ubicación')}
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.address', 'Dirección')}>
                        <TextInput
                            value={data.address || ''}
                            onChange={(v) => updateData('address', v)}
                            placeholder={t('landingEditor.addressPlaceholder', 'Dirección completa')}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.latitude', 'Latitud')}>
                        <TextInput
                            value={String(data.latitude || '')}
                            onChange={(v) => updateData('latitude', parseFloat(v) || 0)}
                            placeholder="40.7128"
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.longitude', 'Longitud')}>
                        <TextInput
                            value={String(data.longitude || '')}
                            onChange={(v) => updateData('longitude', parseFloat(v) || 0)}
                            placeholder="-74.0060"
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <ControlGroup label={t('landingEditor.mapZoom', 'Zoom del Mapa')}>
                        <RangeControl
                            value={data.zoom || 15}
                            onChange={(v) => updateData('zoom', v)}
                            min={10}
                            max={20}
                            step={1}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.mapHeight', 'Altura del Mapa')}>
                        <RangeControl
                            value={data.height || 400}
                            onChange={(v) => updateData('height', v)}
                            min={200}
                            max={800}
                            step={50}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.paddingY', 'Espaciado Vertical')}>
                        <SelectControl
                            value={data.paddingY || 'lg'}
                            onChange={(v) => updateData('paddingY', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                            ]}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // MENU CONTROLS (Restaurant/Service Menu)
    // ========================================================================
    const renderMenuControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                        <TextInput
                            value={data.title || ''}
                            onChange={(v) => updateData('title', v)}
                            placeholder={t('landingEditor.menuTitle', 'Nuestro Menú')}
                        />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.description', 'Descripción')}>
                        <TextInput
                            value={data.description || ''}
                            onChange={(v) => updateData('description', v)}
                            placeholder={t('landingEditor.menuDesc', 'Descubre nuestras opciones')}
                            multiline
                        />
                        <FontSizeSelector
                            label="Tamaño de Descripción"
                            value={data.descriptionFontSize || 'md'}
                            onChange={(v) => updateData('descriptionFontSize', v)}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.variant', 'Variante')}>
                        <SelectControl
                            value={data.menuVariant || 'classic'}
                            onChange={(v) => updateData('menuVariant', v)}
                            options={[
                                { value: 'classic', label: t('landingEditor.variantClassic', 'Clásico') },
                                { value: 'cards', label: t('landingEditor.variantCards', 'Tarjetas') },
                                { value: 'minimal', label: t('landingEditor.variantMinimal', 'Minimal') },
                            ]}
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <ControlGroup label={t('landingEditor.paddingY', 'Espaciado Vertical')}>
                        <SelectControl
                            value={data.paddingY || 'lg'}
                            onChange={(v) => updateData('paddingY', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                            ]}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.backgroundColor', 'Color de Fondo')}>
                        <ColorControl
                            value={data.colors?.background || '#0f172a'}
                            onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.accentColor', 'Color de Acento')}>
                        <ColorControl
                            value={data.colors?.accent || '#6366f1'}
                            onChange={(v) => updateData('colors', { ...data.colors, accent: v })}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // BANNER CONTROLS
    // ========================================================================
    const renderBannerControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.bannerText', 'Texto del Banner')}>
                        <TextInput
                            value={data.text || ''}
                            onChange={(v) => updateData('text', v)}
                            placeholder={t('landingEditor.bannerTextPlaceholder', 'Oferta especial...')}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.buttonText', 'Texto del Botón')}>
                        <TextInput
                            value={data.buttonText || ''}
                            onChange={(v) => updateData('buttonText', v)}
                            placeholder={t('landingEditor.learnMore', 'Ver más')}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.buttonLink', 'Enlace del Botón')}>
                        <TextInput
                            value={data.buttonLink || ''}
                            onChange={(v) => updateData('buttonLink', v)}
                            placeholder="#"
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <ControlGroup label={t('landingEditor.backgroundColor', 'Color de Fondo')}>
                        <ColorControl
                            value={data.colors?.background || '#6366f1'}
                            onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.textColor', 'Color de Texto')}>
                        <ColorControl
                            value={data.colors?.text || '#ffffff'}
                            onChange={(v) => updateData('colors', { ...data.colors, text: v })}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // HERO SPLIT CONTROLS
    // ========================================================================
    const renderHeroSplitControls = () => (
        <div className="space-y-4">
            {activeTab === 'content' && (
                <>
                    <ControlGroup label={t('landingEditor.headline', 'Título Principal')}>
                        <TextInput
                            value={data.headline || ''}
                            onChange={(v) => updateData('headline', v)}
                            placeholder={t('landingEditor.headlinePlaceholder', 'Tu título aquí')}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.subheadline', 'Subtítulo')}>
                        <TextInput
                            value={data.subheadline || ''}
                            onChange={(v) => updateData('subheadline', v)}
                            placeholder={t('landingEditor.subheadlinePlaceholder', 'Descripción breve')}
                            multiline
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.primaryCta', 'Botón Principal')}>
                        <TextInput
                            value={data.primaryCta || ''}
                            onChange={(v) => updateData('primaryCta', v)}
                            placeholder={t('landingEditor.ctaPlaceholder', 'Comenzar')}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.secondaryCta', 'Botón Secundario')}>
                        <TextInput
                            value={data.secondaryCta || ''}
                            onChange={(v) => updateData('secondaryCta', v)}
                            placeholder={t('landingEditor.ctaSecondaryPlaceholder', 'Saber más')}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.image', 'Imagen')}>
                        <ImagePicker
                            currentImage={data.imageUrl || ''}
                            onSelectImage={(url) => updateData('imageUrl', url)}
                            prompt={data.headline || 'hero image'}
                        />
                    </ControlGroup>
                </>
            )}
            {activeTab === 'style' && (
                <>
                    <ControlGroup label={t('landingEditor.imagePosition', 'Posición de Imagen')}>
                        <SelectControl
                            value={data.imagePosition || 'right'}
                            onChange={(v) => updateData('imagePosition', v)}
                            options={[
                                { value: 'left', label: t('landingEditor.left', 'Izquierda') },
                                { value: 'right', label: t('landingEditor.right', 'Derecha') },
                            ]}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.paddingY', 'Espaciado Vertical')}>
                        <SelectControl
                            value={data.paddingY || 'lg'}
                            onChange={(v) => updateData('paddingY', v)}
                            options={[
                                { value: 'sm', label: t('landingEditor.small', 'Pequeño') },
                                { value: 'md', label: t('landingEditor.medium', 'Mediano') },
                                { value: 'lg', label: t('landingEditor.large', 'Grande') },
                            ]}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.backgroundColor', 'Color de Fondo')}>
                        <ColorControl
                            value={data.colors?.background || '#0f172a'}
                            onChange={(v) => updateData('colors', { ...data.colors, background: v })}
                        />
                    </ControlGroup>
                    <ControlGroup label={t('landingEditor.primaryColor', 'Color Primario')}>
                        <ColorControl
                            value={data.colors?.primary || '#6366f1'}
                            onChange={(v) => updateData('colors', { ...data.colors, primary: v })}
                        />
                    </ControlGroup>
                </>
            )}
        </div>
    );

    // ========================================================================
    // GENERIC CONTROLS (for unsupported section types)
    // ========================================================================
    const renderGenericControls = () => (
        <div className="space-y-4">
            <ControlGroup label={t('landingEditor.sectionTitle', 'Título de Sección')}>
                <TextInput
                    value={data.title || ''}
                    onChange={(v) => updateData('title', v)}
                    placeholder="Título"
                />
                        <FontSizeSelector
                            label="Tamaño del Título"
                            value={data.titleFontSize || 'md'}
                            onChange={(v) => updateData('titleFontSize', v)}
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
                <div className="shrink-0 flex gap-1 bg-editor-panel-bg/95 backdrop-blur-md p-1 rounded-lg border border-editor-border/50 sticky top-0 z-10 shadow-sm m-4 mb-0">
                    <TabButton tab="content" label={t('landingEditor.content', 'Contenido')} icon={<FileText size={16} />} />
                    <TabButton tab="style" label={t('landingEditor.style', 'Estilo')} icon={<Palette size={16} />} />
                </div>
            )}

            {/* Controls */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {renderControls()}
            </div>

            {/* Apply button - fixed at bottom using flexbox */}
            <div className="shrink-0 p-4 border-t border-editor-border bg-editor-panel-bg">
                <button
                    onClick={onRefreshPreview}
                    className="w-full py-2.5 px-4 rounded-lg bg-editor-accent text-editor-bg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
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
                        } else if (imageTargetField === 'items' && imageTargetIndex !== null) {
                            // Handle feature items image update
                            const currentItems = [...(data.items || [])];
                            if (currentItems[imageTargetIndex]) {
                                currentItems[imageTargetIndex] = { ...currentItems[imageTargetIndex], imageUrl: url };
                                updateData('items', currentItems);
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

            {/* Logo Picker Modal (Header section) */}
            <ImagePickerModal
                isOpen={isLogoPickerOpen}
                onClose={() => setIsLogoPickerOpen(false)}
                onSelect={(url) => {
                    updateData('logoImage', url);
                    updateData('logoType', 'image');
                }}
                title={t('landingEditor.selectLogo', 'Seleccionar Logo')}
            />
        </div>
    );
};

export default LandingPageControls;
