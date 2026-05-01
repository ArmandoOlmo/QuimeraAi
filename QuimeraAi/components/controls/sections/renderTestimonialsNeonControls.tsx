import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { ControlsDeps, BackgroundImageControl, TopDotsControl } from '../ControlsShared';
import { Type, Settings, Layout, RotateCcw, Image as ImageIcon, Maximize2 } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { ToggleControl, SliderControl, Input, TextArea, Select , I18nInput, I18nTextArea } from '../../ui/EditorControlPrimitives';
import ImagePicker from '../../ui/ImagePicker';

export const renderTestimonialsNeonControls = (deps: ControlsDeps) => {
    const { data, setNestedData, setAiAssistField, t } = deps;
    const sectionData = data?.testimonialsNeon || {};
    const testimonials = sectionData.testimonials || [];
    const colors = sectionData.colors || {};

    const contentTab = (
        <div className="space-y-4">
            <I18nInput
                label={t('editor.controls.headline', 'Titular')}
                value={sectionData.headline || ''}
                onChange={(val) => setNestedData('testimonialsNeon.headline', val)}
            />
            <I18nTextArea
                label={t('editor.controls.subheadline', 'Subtitular')}
                value={sectionData.subheadline || ''}
                onChange={(val) => setNestedData('testimonialsNeon.subheadline', val)}
                rows={3}
            />

            {/* Testimonials List */}
            <div className="bg-q-bg p-3 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase">
                    {t('editor.testimonialsNeonControls.testimonialsList', 'Testimonios')}
                </label>
                {(testimonials).map((test: any, index: number) => (
                    <div key={index} className="space-y-2 p-3 bg-q-surface rounded border border-q-border relative">
                        <button
                            type="button"
                            onClick={() => {
                                const newList = [...testimonials];
                                newList.splice(index, 1);
                                setNestedData('testimonialsNeon.testimonials', newList);
                            }}
                            className="absolute top-2 right-2 text-q-text-secondary hover:text-red-500"
                        >
                            &times;
                        </button>
                        <I18nInput
                            label={t('editor.controls.name', 'Nombre')}
                            value={test.authorName || ''}
                            onChange={(val) => setNestedData(`testimonialsNeon.testimonials.${index}.authorName`, val)}
                        />
                        <I18nInput
                            label={t('editor.controls.role', 'Cargo')}
                            value={test.authorRole || ''}
                            onChange={(val) => setNestedData(`testimonialsNeon.testimonials.${index}.authorRole`, val)}
                        />
                        <I18nTextArea
                            label={t('editor.controls.quote', 'Cita')}
                            value={test.quote || ''}
                            onChange={(val) => setNestedData(`testimonialsNeon.testimonials.${index}.quote`, val)}
                        />
                        <ImagePicker
                            label={t('editor.controls.authorImage', 'Imagen del Autor')}
                            value={test.authorImage || ''}
                            onChange={(url) => setNestedData(`testimonialsNeon.testimonials.${index}.authorImage`, url)}
                        />
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => {
                        const newList = [...testimonials];
                        newList.push({ quote: 'Nuevo testimonio', authorName: 'Nombre', authorRole: 'Cargo' });
                        setNestedData('testimonialsNeon.testimonials', newList);
                    }}
                    className="w-full py-2 bg-q-surface text-q-text-primary text-sm rounded border border-q-border hover:bg-q-accent hover:text-q-bg transition-colors"
                >
                    + {t('editor.testimonialsNeonControls.addTestimonial', 'Añadir Testimonio')}
                </button>
            </div>
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-q-surface p-3 rounded-lg border border-q-border">
                <label className="text-sm text-q-text-primary font-medium flex items-center gap-2">
                    <Settings size={14} className="text-q-text-secondary" />
                    {t('editor.controls.resetStyles', 'Restaurar Estilos')}
                </label>
                <button
                    type="button"
                    onClick={() => {
                        setNestedData('testimonialsNeon.colors', undefined);
                        setNestedData('testimonialsNeon.glassEffect', undefined);
                        setNestedData('testimonialsNeon.glowIntensity', undefined);
                    }}
                    className="p-1.5 hover:bg-q-bg rounded-md text-q-text-secondary hover:text-primary transition-colors"
                    title={t('editor.controls.resetTooltip', 'Resetear estilos al valor por defecto')}
                >
                    <RotateCcw size={14} />
                </button>
            </div>

            {/* Background Image Setup */}
            <BackgroundImageControl sectionKey="testimonialsNeon" data={data} setNestedData={setNestedData} />

            <div className="bg-q-surface p-4 rounded-lg border border-q-border space-y-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-2 flex items-center gap-2">
                    <Maximize2 size={14} /> Layout
                </label>
                <SliderControl
                    label={t('editor.controls.sectionHeight', 'Altura de la Sección (vh)')}
                    value={sectionData.sectionHeight || 60}
                    onChange={(v) => setNestedData('testimonialsNeon.sectionHeight', v)}
                    min={50} max={120} step={5} suffix="vh"
                />
                <div className="mt-3">
                  <Select
                    label={t('editor.controls.cardBorderRadius', 'Curvatura de Tarjeta')}
                    value={sectionData.cardBorderRadius || '3xl'}
                    onChange={(v) => setNestedData('testimonialsNeon.cardBorderRadius', v)}
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
            <div className="bg-q-surface p-4 rounded-lg border border-q-border space-y-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase">
                    {t('editor.controls.effects', 'Efectos Neon')}
                </label>
                <ToggleControl
                    label={t('editor.controls.glassEffect', 'Efecto Cristal (Glassmorphism)')}
                    checked={sectionData.glassEffect !== false}
                    onChange={(checked) => setNestedData('testimonialsNeon.glassEffect', checked)}
                />
                <TopDotsControl sectionKey="testimonialsNeon" data={data} setNestedData={setNestedData} />
                <div>
                    <label className="block text-xs text-q-text-secondary mb-1">
                        {t('editor.heroNeonControls.glowIntensity', 'Intensidad de Resplandor Neon')}
                    </label>
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={sectionData.glowIntensity ?? 50} 
                        onChange={(e) => setNestedData('testimonialsNeon.glowIntensity', parseInt(e.target.value))}
                        className="w-full accent-editor-accent"
                    />
                    <div className="flex justify-between text-[10px] text-q-text-secondary mt-1">
                        <span>0%</span>
                        <span>{sectionData.glowIntensity ?? 50}%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* Color Settings */}
            <div className="bg-q-surface p-4 rounded-lg border border-q-border space-y-3">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-2">
                    {t('editor.controls.colors', 'Colores')}
                </label>
                <ColorControl
                    label={t('editor.controls.background', 'Fondo Base')}
                    color={colors.background}
                    onChange={(color) => setNestedData('testimonialsNeon.colors.background', color)}
                />
                <ColorControl
                    label={t('editor.controls.headingColor', 'Color del Titular')}
                    color={colors.heading}
                    onChange={(color) => setNestedData('testimonialsNeon.colors.heading', color)}
                />
                <ColorControl
                    label={t('editor.controls.textColor', 'Color del Texto')}
                    color={colors.text}
                    onChange={(color) => setNestedData('testimonialsNeon.colors.text', color)}
                />
                <ColorControl
                    label={t('editor.heroNeonControls.neonColor', 'Color Neon')}
                    color={colors.neonGlow}
                    onChange={(color) => setNestedData('testimonialsNeon.colors.neonGlow', color)}
                />
                <ColorControl
                    label={t('editor.controls.cardBackground', 'Fondo de Tarjeta')}
                    value={colors.cardBackground}
                    onChange={(val) => setNestedData('testimonialsNeon.colors.cardBackground', val)}
                />
                <ColorControl
                    label={t('editor.controls.cardText', 'Texto de Tarjeta')}
                    value={colors.cardText}
                    onChange={(val) => setNestedData('testimonialsNeon.colors.cardText', val)}
                />
            </div>
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
