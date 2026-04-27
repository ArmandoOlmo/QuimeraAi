import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { ControlsDeps, BackgroundImageControl, TopDotsControl } from '../ControlsShared';
import { Type, Settings, Maximize2, RotateCcw, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { ToggleControl, SliderControl, Input, TextArea, Select } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import ImagePicker from '../../ui/ImagePicker';

export const renderPortfolioNeonControls = (deps: ControlsDeps) => {
    const { data, setNestedData, setAiAssistField, t } = deps;
    const sectionData = data?.portfolioNeon || {};

    let images = sectionData.images;
    if (!images || !Array.isArray(images)) {
        images = [
            { url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800&ixlib=rb-4.0.3', title: 'Project Alpha', description: 'Retro game console interface design' },
            { url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=800&ixlib=rb-4.0.3', title: 'Project Beta', description: 'Cyberpunk city illustration' },
            { url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=800&ixlib=rb-4.0.3', title: 'Project Gamma', description: 'Code and developer tools' }
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
                        path: 'portfolioNeon.headline', 
                        value: sectionData.headline, 
                        context: 'Portfolio Neon Headline' 
                    })}
                >
                    <TextArea
                        value={sectionData.headline || ''}
                        onChange={(e) => setNestedData('portfolioNeon.headline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>

                <AIFormControl 
                    label={t('editor.controls.subheadline', 'Subtitular')}
                    onAssistClick={() => setAiAssistField({ 
                        path: 'portfolioNeon.subheadline', 
                        value: sectionData.subheadline, 
                        context: 'Portfolio Neon Subheadline' 
                    })}
                >
                    <TextArea
                        value={sectionData.subheadline || ''}
                        onChange={(e) => setNestedData('portfolioNeon.subheadline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>
            </div>

            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2 mb-4">
                    <ImageIcon size={14} /> {t('editor.controls.gallery', 'Galería de Imágenes')}
                </label>
                
                {images.map((item: any, index: number) => (
                    <div key={index} className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-4 space-y-3 relative">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-editor-accent uppercase">Imagen {index + 1}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const newImages = [...images!];
                                    newImages.splice(index, 1);
                                    setNestedData('portfolioNeon.images', newImages);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title={t('editor.controls.remove', 'Eliminar')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <ImagePicker
                            label={t('editor.controls.image', 'Imagen')}
                            value={item.url || ''}
                            onChange={(url) => setNestedData(`portfolioNeon.images.${index}.url`, url)}
                        />

                        <AIFormControl 
                            label={t('editor.controls.title', 'Título')}
                            onAssistClick={() => setAiAssistField({ 
                                path: `portfolioNeon.images.${index}.title`, 
                                value: item.title, 
                                context: `Portfolio Neon Image ${index} Title` 
                            })}
                        >
                            <Input
                                value={item.title || ''}
                                onChange={(e) => setNestedData(`portfolioNeon.images.${index}.title`, e.target.value)}
                            />
                        </AIFormControl>

                        <AIFormControl 
                            label={t('editor.controls.description', 'Descripción')}
                            onAssistClick={() => setAiAssistField({ 
                                path: `portfolioNeon.images.${index}.description`, 
                                value: item.description, 
                                context: `Portfolio Neon Image ${index} Description` 
                            })}
                        >
                            <TextArea
                                value={item.description || ''}
                                onChange={(e) => setNestedData(`portfolioNeon.images.${index}.description`, e.target.value)}
                                rows={2}
                            />
                        </AIFormControl>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => {
                        const newImg = { url: '', title: 'Nuevo Proyecto', description: 'Descripción del proyecto.' };
                        setNestedData('portfolioNeon.images', [...images!, newImg]);
                    }}
                    className="w-full py-2 mt-2 bg-editor-panel-bg border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <Plus size={14} /> {t('editor.controls.addImage', 'Añadir Imagen')}
                </button>
            </div>
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            {/* Background Image Setup */}
            <BackgroundImageControl sectionKey="portfolioNeon" data={data} setNestedData={setNestedData} />

            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2 flex items-center gap-2">
                    <Maximize2 size={14} /> Layout
                </label>
                <SliderControl
                    label={t('editor.controls.sectionHeight', 'Altura de la Sección (vh)')}
                    value={sectionData.sectionHeight || 60}
                    onChange={(v) => setNestedData('portfolioNeon.sectionHeight', v)}
                    min={50} max={120} step={5} suffix="vh"
                />
                <div className="mt-3">
                  <Select
                    label={t('editor.controls.cardBorderRadius', 'Curvatura de Tarjeta')}
                    value={sectionData.cardBorderRadius || '3xl'}
                    onChange={(v) => setNestedData('portfolioNeon.cardBorderRadius', v)}
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
                    onChange={(checked) => setNestedData('portfolioNeon.glassEffect', checked)}
                />
                <ToggleControl
                    label={t('editor.controls.showBackgroundGrid', 'Mostrar Cuadrícula de Fondo')}
                    checked={sectionData.showBackgroundGrid === true}
                    onChange={(checked) => setNestedData('portfolioNeon.showBackgroundGrid', checked)}
                />
                <TopDotsControl sectionKey="portfolioNeon" data={data} setNestedData={setNestedData} />
                <div>
                    <label className="block text-xs text-editor-text-secondary mb-1">
                        {t('editor.heroNeonControls.glowIntensity', 'Intensidad de Resplandor Neon')}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={sectionData.glowIntensity !== undefined ? sectionData.glowIntensity : 50}
                        onChange={(e) => setNestedData('portfolioNeon.glowIntensity', parseInt(e.target.value))}
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
                            setNestedData('portfolioNeon.colors', undefined);
                            setNestedData('portfolioNeon.glassEffect', undefined);
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
                    onChange={(color) => setNestedData('portfolioNeon.colors.background', color)}
                />
                <ColorControl
                    label={t('editor.controls.cardBackground', 'Fondo de Tarjeta (Overlay)')}
                    value={sectionData.colors?.cardBackground || '#141414'}
                    onChange={(color) => setNestedData('portfolioNeon.colors.cardBackground', color)}
                />
                <ColorControl
                    label={t('editor.controls.headingColor', 'Color de Títulos')}
                    value={sectionData.colors?.heading || '#ffffff'}
                    onChange={(color) => setNestedData('portfolioNeon.colors.heading', color)}
                />
                <ColorControl
                    label={t('editor.controls.textColor', 'Color de Texto')}
                    value={sectionData.colors?.text || '#a1a1aa'}
                    onChange={(color) => setNestedData('portfolioNeon.colors.text', color)}
                />
                <ColorControl
                    label={t('editor.heroNeonControls.neonGlowColor', 'Color de Neón Principal')}
                    value={sectionData.colors?.neonGlow || '#FBB92B'}
                    onChange={(color) => setNestedData('portfolioNeon.colors.neonGlow', color)}
                />
            </div>
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
