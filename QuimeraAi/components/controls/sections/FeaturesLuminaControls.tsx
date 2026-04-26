import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, ToggleControl } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { renderLuminaAnimationControls } from './LuminaSharedControls';
import { Type, List, Plus, Trash2, Settings, Layers, RotateCcw, Image as ImageIcon } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import ImagePicker from '../../ui/ImagePicker';

export const renderFeaturesLuminaControls = (deps: ControlsDeps) => {
  const { data, setNestedData, setAiAssistField, t } = deps;
  if (!data?.featuresLumina) return null;

  const features = data.featuresLumina.features || [];

  const contentTab = (
    <div className="space-y-4">
      {/* Text Content */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('editor.featuresLumina.content', 'Header Content')}
        </label>
        
        <div className="space-y-4">
          <AIFormControl 
            label={t('editor.featuresLumina.headline', 'Headline')} 
            onAssistClick={() => setAiAssistField({ path: 'featuresLumina.headline', value: data.featuresLumina.headline, context: 'Features Lumina Headline' })}
          >
            <TextArea 
              value={data.featuresLumina.headline || ''} 
              onChange={(e) => setNestedData('featuresLumina.headline', e.target.value)} 
              rows={2} 
            />
          </AIFormControl>

          <AIFormControl 
            label={t('editor.featuresLumina.subheadline', 'Subheadline')} 
            onAssistClick={() => setAiAssistField({ path: 'featuresLumina.subheadline', value: data.featuresLumina.subheadline || '', context: 'Features Lumina Subheadline' })}
          >
            <Input 
              label="" 
              value={data.featuresLumina.subheadline || ''} 
              onChange={(e) => setNestedData('featuresLumina.subheadline', e.target.value)} 
            />
          </AIFormControl>
        </div>
      </div>

      {/* Features List */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <List size={14} />
          {t('editor.featuresLumina.items', 'Feature Items')}
        </label>

        {features.map((feature: any, idx: number) => (
          <div key={idx} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 space-y-3 relative group">
            <button
              onClick={() => {
                const newFeatures = features.filter((_: any, i: number) => i !== idx);
                setNestedData('featuresLumina.features', newFeatures);
              }}
              className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
            
            <span className="text-[10px] font-bold text-editor-accent uppercase">Item #{idx + 1}</span>

            <div className="space-y-2">
                <label className="block text-xs font-bold text-editor-text-secondary flex items-center gap-2">
                  <ImageIcon size={12} /> {t('editor.controls.image', 'Image')}
                </label>
                <ImagePicker 
                  value={feature.image || ''} 
                  onChange={(url) => setNestedData(`featuresLumina.features.${idx}.image`, url)} 
                />
            </div>

            <Input 
              label={t('editor.featuresLumina.itemTitle', 'Title')} 
              value={feature.title || ''} 
              onChange={(e) => setNestedData(`featuresLumina.features.${idx}.title`, e.target.value)} 
            />
            
            <TextArea 
              value={feature.description || ''} 
              onChange={(e) => setNestedData(`featuresLumina.features.${idx}.description`, e.target.value)} 
              rows={2}
              placeholder={t('editor.featuresLumina.itemDesc', 'Description')}
            />
          </div>
        ))}

        <button
          onClick={() => {
            const newItem = { title: 'New Feature', description: 'Describe your feature here' };
            setNestedData('featuresLumina.features', [...features, newItem]);
          }}
          className="w-full py-2 bg-editor-accent text-editor-bg rounded-md hover:bg-editor-accent/90 transition-colors flex items-center justify-center gap-2 font-medium text-sm mt-2"
        >
          <Plus size={16} /> {t('editor.featuresLumina.addItem', 'Add Feature')}
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
          checked={data?.featuresLumina?.glassEffect ?? true}
          onChange={(v) => setNestedData('featuresLumina.glassEffect', v)}
        />
      </div>

      <BackgroundImageControl sectionKey="featuresLumina" data={data} setNestedData={setNestedData} />
      
      {renderLuminaAnimationControls(data.featuresLumina, (key, value) => setNestedData(`featuresLumina.${key}`, value))}
      
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2">
            <Settings size={14} />
            {t('editor.controls.common.colors', 'Colors')}
          </label>
          <button
            onClick={() => {
              setNestedData('featuresLumina.colors', {});
              setNestedData('featuresLumina.glassEffect', true);
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
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={data.featuresLumina.colors?.panelBackground} onChange={(v) => setNestedData('featuresLumina.colors.panelBackground', v)} />
            <ColorControl label={t('editor.controls.colors.border', 'Border')} value={data.featuresLumina.colors?.panelBorder} onChange={(v) => setNestedData('featuresLumina.colors.panelBorder', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-editor-border/50">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">General</p>
            <ColorControl label="Fondo de Sección" value={data.featuresLumina.colors?.background} onChange={(v) => setNestedData('featuresLumina.colors.background', v)} />
            <ColorControl label={t('editor.controls.common.title', 'Heading')} value={data.featuresLumina.colors?.heading} onChange={(v) => setNestedData('featuresLumina.colors.heading', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={data.featuresLumina.colors?.text} onChange={(v) => setNestedData('featuresLumina.colors.text', v)} />
          </div>
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
