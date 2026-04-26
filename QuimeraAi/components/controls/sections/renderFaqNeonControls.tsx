import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { Type, Settings, Maximize2, RotateCcw, Trash2, Plus, MessageCircle } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { ToggleControl, SliderControl, Input, TextArea } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';

export const renderFaqNeonControls = (deps: ControlsDeps) => {
    const { data, setNestedData, setAiAssistField, t } = deps;
    const sectionData = data?.faqNeon || {};

    let faqs = sectionData.faqs;
    if (!faqs || !Array.isArray(faqs)) {
        faqs = [
            { question: 'Is there a free trial available?', answer: 'Yes, you can try us for free for 30 days.' },
            { question: 'Can I change my plan later?', answer: 'Of course. Our pricing scales with your company.' },
            { question: 'What is your cancellation policy?', answer: 'You can cancel your plan at any time.' }
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
                        path: 'faqNeon.headline', 
                        value: sectionData.headline, 
                        context: 'FAQ Neon Headline' 
                    })}
                >
                    <TextArea
                        value={sectionData.headline || ''}
                        onChange={(e) => setNestedData('faqNeon.headline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>

                <AIFormControl 
                    label={t('editor.controls.subheadline', 'Subtitular')}
                    onAssistClick={() => setAiAssistField({ 
                        path: 'faqNeon.subheadline', 
                        value: sectionData.subheadline, 
                        context: 'FAQ Neon Subheadline' 
                    })}
                >
                    <TextArea
                        value={sectionData.subheadline || ''}
                        onChange={(e) => setNestedData('faqNeon.subheadline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>
            </div>

            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2 mb-4">
                    <MessageCircle size={14} /> {t('editor.controls.questionsList', 'Preguntas Frecuentes')}
                </label>
                
                {faqs.map((faq: any, index: number) => (
                    <div key={index} className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-4 space-y-3 relative">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-editor-accent uppercase">Pregunta {index + 1}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const newFaqs = [...faqs!];
                                    newFaqs.splice(index, 1);
                                    setNestedData('faqNeon.faqs', newFaqs);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title={t('editor.controls.remove', 'Eliminar')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <AIFormControl 
                            label={t('editor.controls.question', 'Pregunta')}
                            onAssistClick={() => setAiAssistField({ 
                                path: `faqNeon.faqs.${index}.question`, 
                                value: faq.question, 
                                context: `FAQ Neon Question ${index}` 
                            })}
                        >
                            <Input
                                value={faq.question || ''}
                                onChange={(e) => setNestedData(`faqNeon.faqs.${index}.question`, e.target.value)}
                            />
                        </AIFormControl>

                        <AIFormControl 
                            label={t('editor.controls.answer', 'Respuesta')}
                            onAssistClick={() => setAiAssistField({ 
                                path: `faqNeon.faqs.${index}.answer`, 
                                value: faq.answer, 
                                context: `FAQ Neon Answer ${index}` 
                            })}
                        >
                            <TextArea
                                value={faq.answer || ''}
                                onChange={(e) => setNestedData(`faqNeon.faqs.${index}.answer`, e.target.value)}
                                rows={3}
                            />
                        </AIFormControl>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => {
                        const newFaq = { question: 'Nueva Pregunta', answer: 'Respuesta detallada.' };
                        setNestedData('faqNeon.faqs', [...faqs!, newFaq]);
                    }}
                    className="w-full py-2 mt-2 bg-editor-panel-bg border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <Plus size={14} /> {t('editor.controls.addQuestion', 'Añadir Pregunta')}
                </button>
            </div>
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            {/* Background Image Setup */}
            <BackgroundImageControl sectionKey="faqNeon" data={data} setNestedData={setNestedData} />

            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2 flex items-center gap-2">
                    <Maximize2 size={14} /> Layout
                </label>
                <SliderControl
                    label={t('editor.controls.sectionHeight', 'Altura de la Sección (vh)')}
                    value={sectionData.sectionHeight || 100}
                    onChange={(v) => setNestedData('faqNeon.sectionHeight', v)}
                    min={50} max={120} step={5} suffix="vh"
                />
            </div>

            {/* Effect Settings */}
            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase">
                    {t('editor.controls.effects', 'Efectos Neon')}
                </label>
                <ToggleControl
                    label={t('editor.controls.glassEffect', 'Efecto Cristal (Glassmorphism)')}
                    checked={sectionData.glassEffect !== false}
                    onChange={(checked) => setNestedData('faqNeon.glassEffect', checked)}
                />
                <ToggleControl
                    label={t('editor.controls.showBackgroundGrid', 'Mostrar Cuadrícula de Fondo')}
                    checked={sectionData.showBackgroundGrid !== false}
                    onChange={(checked) => setNestedData('faqNeon.showBackgroundGrid', checked)}
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
                        onChange={(e) => setNestedData('faqNeon.glowIntensity', parseInt(e.target.value))}
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
                            setNestedData('faqNeon.colors', undefined);
                            setNestedData('faqNeon.glassEffect', undefined);
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
                    onChange={(color) => setNestedData('faqNeon.colors.background', color)}
                />
                <ColorControl
                    label={t('editor.controls.cardBackground', 'Fondo de Tarjeta')}
                    value={sectionData.colors?.cardBackground || '#141414'}
                    onChange={(color) => setNestedData('faqNeon.colors.cardBackground', color)}
                />
                <ColorControl
                    label={t('editor.controls.headingColor', 'Color de Títulos')}
                    value={sectionData.colors?.heading || '#ffffff'}
                    onChange={(color) => setNestedData('faqNeon.colors.heading', color)}
                />
                <ColorControl
                    label={t('editor.controls.textColor', 'Color de Texto')}
                    value={sectionData.colors?.text || '#a1a1aa'}
                    onChange={(color) => setNestedData('faqNeon.colors.text', color)}
                />
                <ColorControl
                    label={t('editor.heroNeonControls.neonGlowColor', 'Color de Neón Principal')}
                    value={sectionData.colors?.neonGlow || '#FBB92B'}
                    onChange={(color) => setNestedData('faqNeon.colors.neonGlow', color)}
                />
            </div>
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
