import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, ToggleControl } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import ImagePicker from '../../ui/ImagePicker';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { renderLuminaAnimationControls } from './LuminaSharedControls';
import { Type, MessageSquare, Plus, Trash2, Settings, Layers, RotateCcw } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';

export const renderTestimonialsLuminaControls = (deps: ControlsDeps) => {
  const { data, setNestedData, setAiAssistField, t } = deps;
  if (!data?.testimonialsLumina) return null;

  const testimonials = data.testimonialsLumina.testimonials || [];

  const contentTab = (
    <div className="space-y-4">
      {/* Text Content */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('editor.testimonialsLumina.content', 'Header Content')}
        </label>
        
        <div className="space-y-4">
          <AIFormControl 
            label={t('editor.testimonialsLumina.headline', 'Headline')} 
            onAssistClick={() => setAiAssistField({ path: 'testimonialsLumina.headline', value: data.testimonialsLumina.headline, context: 'Testimonials Lumina Headline' })}
          >
            <Input 
              label=""
              value={data.testimonialsLumina.headline || ''} 
              onChange={(e) => setNestedData('testimonialsLumina.headline', e.target.value)} 
            />
          </AIFormControl>

          <AIFormControl 
            label={t('editor.testimonialsLumina.subheadline', 'Subheadline')} 
            onAssistClick={() => setAiAssistField({ path: 'testimonialsLumina.subheadline', value: data.testimonialsLumina.subheadline || '', context: 'Testimonials Lumina Subheadline' })}
          >
            <TextArea 
              value={data.testimonialsLumina.subheadline || ''} 
              onChange={(e) => setNestedData('testimonialsLumina.subheadline', e.target.value)} 
              rows={2}
            />
          </AIFormControl>
        </div>
      </div>

      {/* Testimonials List */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <MessageSquare size={14} />
          {t('editor.testimonialsLumina.testimonials', 'Testimonials')}
        </label>

        {testimonials.map((test: any, idx: number) => (
          <div key={idx} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 space-y-3 relative group">
            <button
              onClick={() => {
                const newTests = testimonials.filter((_: any, i: number) => i !== idx);
                setNestedData('testimonialsLumina.testimonials', newTests);
              }}
              className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100 z-10"
            >
              <Trash2 size={14} />
            </button>
            
            <span className="text-[10px] font-bold text-editor-accent uppercase block mb-2">Testimonial #{idx + 1}</span>

            <TextArea 
              label={t('editor.testimonialsLumina.quote', 'Quote')} 
              value={test.quote || ''} 
              onChange={(e) => setNestedData(`testimonialsLumina.testimonials.${idx}.quote`, e.target.value)} 
              rows={3}
            />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input 
                label={t('editor.testimonialsLumina.authorName', 'Author Name')} 
                value={test.authorName || ''} 
                onChange={(e) => setNestedData(`testimonialsLumina.testimonials.${idx}.authorName`, e.target.value)} 
              />
              <Input 
                label={t('editor.testimonialsLumina.authorRole', 'Author Role')} 
                value={test.authorRole || ''} 
                onChange={(e) => setNestedData(`testimonialsLumina.testimonials.${idx}.authorRole`, e.target.value)} 
              />
            </div>

            <ImagePicker
              label={t('editor.testimonialsLumina.authorImage', 'Author Image')}
              value={test.authorImage || ''}
              onChange={(url) => setNestedData(`testimonialsLumina.testimonials.${idx}.authorImage`, url)}
              onRemove={() => setNestedData(`testimonialsLumina.testimonials.${idx}.authorImage`, '')}
            />
          </div>
        ))}

        <button
          onClick={() => {
            const newTest = { quote: 'Great product!', authorName: 'John Doe', authorRole: 'Customer', authorImage: '' };
            setNestedData('testimonialsLumina.testimonials', [...testimonials, newTest]);
          }}
          className="w-full py-2 bg-editor-accent text-editor-bg rounded-md hover:bg-editor-accent/90 transition-colors flex items-center justify-center gap-2 font-medium text-sm mt-2"
        >
          <Plus size={16} /> {t('editor.testimonialsLumina.addTestimonial', 'Add Testimonial')}
        </button>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t('controls.glassmorphismTransparencia', 'Transparencia (Glassmorphism)')}
          checked={data?.testimonialsLumina?.glassEffect ?? true}
          onChange={(v) => setNestedData('testimonialsLumina.glassEffect', v)}
        />
      </div>

      <BackgroundImageControl sectionKey="testimonialsLumina" data={data} setNestedData={setNestedData} />
      
      {renderLuminaAnimationControls(data.testimonialsLumina, (key, value) => setNestedData(`testimonialsLumina.${key}`, value))}
      
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2">
            <Settings size={14} />
            {t('editor.controls.common.colors', 'Colors')}
          </label>
          <button
            onClick={() => {
              setNestedData('testimonialsLumina.colors', {});
              setNestedData('testimonialsLumina.glassEffect', true);
            }}
            className="flex items-center gap-1.5 px-2 py-1 bg-editor-bg border border-editor-border rounded text-[10px] text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent/30 transition-colors"
            title="Restaurar a los colores originales de Lumina"
          >
            <RotateCcw size={10} />
            Restaurar Original
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">{t('editor.controls.colors.panel', 'Panel')}</p>
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={data.testimonialsLumina.colors?.panelBackground} onChange={(v) => setNestedData('testimonialsLumina.colors.panelBackground', v)} />
            <ColorControl label={t('editor.controls.colors.border', 'Border')} value={data.testimonialsLumina.colors?.panelBorder} onChange={(v) => setNestedData('testimonialsLumina.colors.panelBorder', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-editor-border/50">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">Textos</p>
            <ColorControl label="Fondo de Sección" value={data.testimonialsLumina.colors?.background} onChange={(v) => setNestedData('testimonialsLumina.colors.background', v)} />
            <ColorControl label={t('editor.controls.common.title', 'Heading')} value={data.testimonialsLumina.colors?.heading} onChange={(v) => setNestedData('testimonialsLumina.colors.heading', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={data.testimonialsLumina.colors?.text} onChange={(v) => setNestedData('testimonialsLumina.colors.text', v)} />
          </div>
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
