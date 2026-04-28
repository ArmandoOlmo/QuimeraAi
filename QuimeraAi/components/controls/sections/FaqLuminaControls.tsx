import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, ToggleControl } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { renderLuminaAnimationControls } from './LuminaSharedControls';
import { Type, HelpCircle, Plus, Trash2, Settings, Layers, RotateCcw } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';

export const renderFaqLuminaControls = (deps: ControlsDeps) => {
  const { data, setNestedData, setAiAssistField, t } = deps;
  if (!data?.faqLumina) return null;

  const faqs = data.faqLumina.faqs || [];

  const contentTab = (
    <div className="space-y-4">
      {/* Text Content */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('editor.faqLumina.content', 'Header Content')}
        </label>
        
        <div className="space-y-4">
          <AIFormControl 
            label={t('editor.faqLumina.headline', 'Headline')} 
            onAssistClick={() => setAiAssistField({ path: 'faqLumina.headline', value: data.faqLumina.headline, context: 'FAQ Lumina Headline' })}
          >
            <Input 
              label=""
              value={data.faqLumina.headline || ''} 
              onChange={(e) => setNestedData('faqLumina.headline', e.target.value)} 
            />
          </AIFormControl>

          <AIFormControl 
            label={t('editor.faqLumina.subheadline', 'Subheadline')} 
            onAssistClick={() => setAiAssistField({ path: 'faqLumina.subheadline', value: data.faqLumina.subheadline || '', context: 'FAQ Lumina Subheadline' })}
          >
            <TextArea 
              value={data.faqLumina.subheadline || ''} 
              onChange={(e) => setNestedData('faqLumina.subheadline', e.target.value)} 
              rows={2}
            />
          </AIFormControl>
        </div>
      </div>

      {/* FAQs List */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <HelpCircle size={14} />
          {t('editor.faqLumina.faqs', 'FAQs')}
        </label>

        {faqs.map((faq: any, idx: number) => (
          <div key={idx} className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 space-y-3 relative group">
            <button
              onClick={() => {
                const newFaqs = faqs.filter((_: any, i: number) => i !== idx);
                setNestedData('faqLumina.faqs', newFaqs);
              }}
              className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100 z-10"
            >
              <Trash2 size={14} />
            </button>
            
            <span className="text-[10px] font-bold text-q-accent uppercase block mb-2">Question #{idx + 1}</span>

            <Input 
              label={t('editor.faqLumina.question', 'Question')} 
              value={faq.question || ''} 
              onChange={(e) => setNestedData(`faqLumina.faqs.${idx}.question`, e.target.value)} 
            />
            
            <TextArea 
              label={t('editor.faqLumina.answer', 'Answer')} 
              value={faq.answer || ''} 
              onChange={(e) => setNestedData(`faqLumina.faqs.${idx}.answer`, e.target.value)} 
              rows={3}
            />
          </div>
        ))}

        <button
          onClick={() => {
            const newFaq = { question: 'New Question?', answer: 'Detailed answer here.' };
            setNestedData('faqLumina.faqs', [...faqs, newFaq]);
          }}
          className="w-full py-2 bg-q-accent text-q-bg rounded-md hover:bg-q-accent/90 transition-colors flex items-center justify-center gap-2 font-medium text-sm mt-2"
        >
          <Plus size={16} /> {t('editor.faqLumina.addFaq', 'Add Question')}
        </button>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t('controls.glassmorphismTransparencia', 'Transparencia (Glassmorphism)')}
          checked={data?.faqLumina?.glassEffect ?? true}
          onChange={(v) => setNestedData('faqLumina.glassEffect', v)}
        />
      </div>

      <BackgroundImageControl sectionKey="faqLumina" data={data} setNestedData={setNestedData} />
      
      {renderLuminaAnimationControls(data.faqLumina, (key, value) => setNestedData(`faqLumina.${key}`, value))}
      
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2">
            <Settings size={14} />
            {t('editor.controls.common.colors', 'Colors')}
          </label>
          <button
            onClick={() => {
              setNestedData('faqLumina.colors', {});
              setNestedData('faqLumina.glassEffect', true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 bg-q-bg border border-q-border rounded text-[10px] text-q-text-secondary hover:text-q-accent hover:border-q-accent/30 transition-colors"
            title="Restaurar a los colores originales de Lumina"
          >
            <RotateCcw size={10} />
            Restaurar Original
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.controls.colors.panel', 'Panel')}</p>
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={data.faqLumina.colors?.panelBackground} onChange={(v) => setNestedData('faqLumina.colors.panelBackground', v)} />
            <ColorControl label={t('editor.controls.colors.border', 'Border')} value={data.faqLumina.colors?.panelBorder} onChange={(v) => setNestedData('faqLumina.colors.panelBorder', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-q-border/50">
            <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">Textos</p>
            <ColorControl label="Fondo de Sección" value={data.faqLumina.colors?.background} onChange={(v) => setNestedData('faqLumina.colors.background', v)} />
            <ColorControl label={t('editor.controls.common.title', 'Heading')} value={data.faqLumina.colors?.heading} onChange={(v) => setNestedData('faqLumina.colors.heading', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={data.faqLumina.colors?.text} onChange={(v) => setNestedData('faqLumina.colors.text', v)} />
          </div>
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
