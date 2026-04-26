import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { Type, Settings, Layout, RotateCcw, Image as ImageIcon, Maximize2, Trash2, Plus, List } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { ToggleControl, SliderControl, Input, TextArea, Select } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import ImagePicker from '../../ui/ImagePicker';

export const renderFeaturesNeonControls = (deps: ControlsDeps) => {
    const { data, setNestedData, setAiAssistField, t } = deps;
    const sectionData = data?.featuresNeon || {};

    let features = sectionData.features;
    if (!features || !Array.isArray(features)) {
        features = [
            { title: 'High Performance', description: 'Lightning fast load times and optimized delivery.' },
            { title: 'Secure by Design', description: 'Enterprise-grade security built into the core.' },
            { title: '24/7 Support', description: 'Our team is always here to help you out.' }
        ];
    }

    const contentTab = (
        <div className="space-y-6">
            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2">
                    <Type size={14} /> {t('editor.controls.typography', 'Textos Principales')}
                </label>
                
                <AIFormControl 
                    label={t('editor.controls.headline', 'Titular')}
                    onAssistClick={() => setAiAssistField({ 
                        path: 'featuresNeon.headline', 
                        value: sectionData.headline, 
                        context: 'Features Neon Headline' 
                    })}
                >
                    <TextArea
                        value={sectionData.headline || ''}
                        onChange={(e) => setNestedData('featuresNeon.headline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>

                <AIFormControl 
                    label={t('editor.controls.subheadline', 'Subtitular')}
                    onAssistClick={() => setAiAssistField({ 
                        path: 'featuresNeon.subheadline', 
                        value: sectionData.subheadline, 
                        context: 'Features Neon Subheadline' 
                    })}
                >
                    <TextArea
                        value={sectionData.subheadline || ''}
                        onChange={(e) => setNestedData('featuresNeon.subheadline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>
            </div>

            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2 mb-4">
                    <List size={14} /> {t('editor.controls.featuresList', 'Lista de Características')}
                </label>
                
                {features.map((feature: any, index: number) => (
                    <div key={index} className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-4 space-y-3 relative">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-editor-accent uppercase">Card {index + 1}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const newFeatures = [...features!];
                                    newFeatures.splice(index, 1);
                                    setNestedData('featuresNeon.features', newFeatures);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title={t('editor.controls.remove', 'Eliminar')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <AIFormControl 
                            label={t('editor.controls.title', 'Título')}
                            onAssistClick={() => setAiAssistField({ 
                                path: `featuresNeon.features.${index}.title`, 
                                value: feature.title, 
                                context: `Features Neon Feature ${index} Title` 
                            })}
                        >
                            <Input
                                value={feature.title || ''}
                                onChange={(e) => setNestedData(`featuresNeon.features.${index}.title`, e.target.value)}
                            />
                        </AIFormControl>

                        <AIFormControl 
                            label={t('editor.controls.description', 'Descripción')}
                            onAssistClick={() => setAiAssistField({ 
                                path: `featuresNeon.features.${index}.description`, 
                                value: feature.description, 
                                context: `Features Neon Feature ${index} Description` 
                            })}
                        >
                            <TextArea
                                value={feature.description || ''}
                                onChange={(e) => setNestedData(`featuresNeon.features.${index}.description`, e.target.value)}
                                rows={2}
                            />
                        </AIFormControl>

                        <ImagePicker
                            label={t('editor.controls.featureImage', 'Imagen de Característica (Opcional)')}
                            value={feature.imageUrl || ''}
                            onChange={(url) => setNestedData(`featuresNeon.features.${index}.imageUrl`, url)}
                        />
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => {
                        const newFeature = { title: 'Nueva Característica', description: 'Descripción detallada aquí.' };
                        setNestedData('featuresNeon.features', [...features!, newFeature]);
                    }}
                    className="w-full py-2 mt-2 bg-editor-panel-bg border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <Plus size={14} /> {t('editor.controls.addFeature', 'Añadir Característica')}
                </button>
            </div>
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            {/* Background Image Setup */}
            <BackgroundImageControl sectionKey="featuresNeon" data={data} setNestedData={setNestedData} />

            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2 flex items-center gap-2">
                    <Maximize2 size={14} /> Layout
                </label>
                <SliderControl
                    label={t('editor.controls.sectionHeight', 'Altura de la Sección (vh)')}
                    value={sectionData.sectionHeight || 100}
                    onChange={(v) => setNestedData('featuresNeon.sectionHeight', v)}
                    min={50} max={120} step={5} suffix="vh"
                />
                <div className="mt-3">
                  <Select
                    label={t('editor.controls.cardBorderRadius', 'Curvatura de Tarjeta')}
                    value={sectionData.cardBorderRadius || '3xl'}
                    onChange={(e) => setNestedData('featuresNeon.cardBorderRadius', e.target.value)}
                    options={[
                      { value: 'none', label: 'Cuadrada (None)' },
                      { value: 'md', label: 'Suave (MD)' },
                      { value: 'xl', label: 'Media (XL)' },
                      { value: '2xl', label: 'Redondeada (2XL)' },
                      { value: '3xl', label: 'Muy Redondeada (3XL)' },
                      { value: 'full', label: 'Circular (Full)' }
                    ]}
                  />
                </div>
            </div>

            {/* Effect Settings */}
            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase">
                    {t('editor.controls.effects', 'Efectos Neon')}
                </label>
                <ToggleControl
                    label={t('editor.controls.glassEffect', 'Efecto Cristal (Glassmorphism)')}
                    checked={sectionData.glassEffect !== false}
                    onChange={(checked) => setNestedData('featuresNeon.glassEffect', checked)}
                />
                <ToggleControl
                    label={t('editor.controls.showBackgroundGrid', 'Mostrar Cuadrícula de Fondo')}
                    checked={sectionData.showBackgroundGrid !== false}
                    onChange={(checked) => setNestedData('featuresNeon.showBackgroundGrid', checked)}
                />
                <div>
                    <label className="block text-xs text-editor-text-secondary mb-1">
                        {t('editor.heroNeonControls.glowIntensity', 'Intensidad de Resplandor Neon')}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={sectionData.glowIntensity !== undefined ? sectionData.glowIntensity : 50}
                        onChange={(e) => setNestedData('featuresNeon.glowIntensity', parseInt(e.target.value))}
                        className="w-full accent-editor-accent"
                    />
                </div>
            </div>

            {/* Colors */}
            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-3">
                <div className="flex items-center justify-between mb-4">
                    <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2">
                        <Settings size={14} /> {t('editor.controls.colors', 'Colores')}
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            setNestedData('featuresNeon.colors', undefined);
                            setNestedData('featuresNeon.glassEffect', undefined);
                        }}
                        className="text-xs text-editor-text-secondary hover:text-editor-accent flex items-center gap-1 transition-colors"
                        title={t('editor.controls.restoreOriginalColors', 'Restaurar colores por defecto')}
                    >
                        <RotateCcw size={12} /> Restaurar
                    </button>
                </div>
                
                <ColorControl
                    label={t('editor.controls.backgroundColor', 'Fondo General')}
                    value={sectionData.colors?.background || '#0a0a0a'}
                    onChange={(color) => setNestedData('featuresNeon.colors.background', color)}
                />
                <ColorControl
                    label={t('editor.controls.cardBackground', 'Fondo de Tarjetas')}
                    value={sectionData.colors?.cardBackground || '#141414'}
                    onChange={(color) => setNestedData('featuresNeon.colors.cardBackground', color)}
                />
                <ColorControl
                    label={t('editor.controls.headingColor', 'Color de Títulos')}
                    value={sectionData.colors?.heading || '#ffffff'}
                    onChange={(color) => setNestedData('featuresNeon.colors.heading', color)}
                />
                <ColorControl
                    label={t('editor.controls.textColor', 'Color de Texto')}
                    value={sectionData.colors?.text || '#a1a1aa'}
                    onChange={(color) => setNestedData('featuresNeon.colors.text', color)}
                />
                <ColorControl
                    label={t('editor.heroNeonControls.neonGlowColor', 'Color de Neón Principal')}
                    value={sectionData.colors?.neonGlow || '#FBB92B'}
                    onChange={(color) => setNestedData('featuresNeon.colors.neonGlow', color)}
                />
            </div>
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
