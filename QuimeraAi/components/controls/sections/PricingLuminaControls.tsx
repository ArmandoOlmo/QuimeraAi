import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, Select, ToggleControl } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { renderLuminaAnimationControls } from './LuminaSharedControls';
import { Type, DollarSign, Plus, Trash2, Settings, Layers, RotateCcw } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { SingleProductSelector, SingleCollectionSelector, SingleContentSelector } from '../../ui/EcommerceControls';

export const renderPricingLuminaControls = (deps: ControlsDeps) => {
  const { data, setNestedData, setAiAssistField, t, activeProject } = deps;
  if (!data?.pricingLumina) return null;

  const tiers = data.pricingLumina.tiers || [];

  const contentTab = (
    <div className="space-y-4">
      {/* Text Content */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('editor.pricingLumina.content', 'Header Content')}
        </label>
        
        <div className="space-y-4">
          <AIFormControl 
            label={t('editor.pricingLumina.headline', 'Headline')} 
            onAssistClick={() => setAiAssistField({ path: 'pricingLumina.headline', value: data.pricingLumina.headline, context: 'Pricing Lumina Headline' })}
          >
            <Input 
              label=""
              value={data.pricingLumina.headline || ''} 
              onChange={(e) => setNestedData('pricingLumina.headline', e.target.value)} 
            />
          </AIFormControl>

          <AIFormControl 
            label={t('editor.pricingLumina.subheadline', 'Subheadline')} 
            onAssistClick={() => setAiAssistField({ path: 'pricingLumina.subheadline', value: data.pricingLumina.subheadline || '', context: 'Pricing Lumina Subheadline' })}
          >
            <TextArea 
              value={data.pricingLumina.subheadline || ''} 
              onChange={(e) => setNestedData('pricingLumina.subheadline', e.target.value)} 
              rows={2}
            />
          </AIFormControl>
        </div>
      </div>

      {/* Tiers List */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <DollarSign size={14} />
          {t('editor.pricingLumina.tiers', 'Pricing Tiers')}
        </label>

        {tiers.map((tier: any, idx: number) => (
          <div key={idx} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 space-y-3 relative group">
            <button
              onClick={() => {
                const newTiers = tiers.filter((_: any, i: number) => i !== idx);
                setNestedData('pricingLumina.tiers', newTiers);
              }}
              className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100 z-10"
            >
              <Trash2 size={14} />
            </button>
            
            <span className="text-[10px] font-bold text-editor-accent uppercase block mb-2">Tier #{idx + 1}</span>

            <div className="grid grid-cols-2 gap-2">
              <Input 
                label={t('editor.pricingLumina.tierName', 'Name')} 
                value={tier.name || ''} 
                onChange={(e) => setNestedData(`pricingLumina.tiers.${idx}.name`, e.target.value)} 
              />
              <ToggleControl 
                label={t('editor.pricingLumina.isPopular', 'Most Popular')} 
                checked={tier.isPopular || false} 
                onChange={(v) => setNestedData(`pricingLumina.tiers.${idx}.isPopular`, v)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input 
                label={t('editor.pricingLumina.tierPrice', 'Price')} 
                value={tier.price || ''} 
                onChange={(e) => setNestedData(`pricingLumina.tiers.${idx}.price`, e.target.value)} 
              />
              <Input 
                label={t('editor.pricingLumina.tierPeriod', 'Period')} 
                value={tier.period || ''} 
                onChange={(e) => setNestedData(`pricingLumina.tiers.${idx}.period`, e.target.value)} 
                placeholder="/mo"
              />
            </div>

            <Input 
              label={t('editor.pricingLumina.tierDescription', 'Description')} 
              value={tier.description || ''} 
              onChange={(e) => setNestedData(`pricingLumina.tiers.${idx}.description`, e.target.value)} 
            />

            {/* Features (comma separated for simplicity in generic control) */}
            <TextArea 
              label={t('editor.pricingLumina.tierFeatures', 'Features (one per line)')} 
              value={(tier.features || []).join('\n')} 
              onChange={(e) => setNestedData(`pricingLumina.tiers.${idx}.features`, e.target.value.split('\n').filter(Boolean))} 
              rows={4}
            />

            <div className="mt-2">
              <Input 
                label={t('editor.pricingLumina.buttonText', 'Button Text')} 
                value={tier.buttonText || ''} 
                onChange={(e) => setNestedData(`pricingLumina.tiers.${idx}.buttonText`, e.target.value)} 
              />
            </div>

            {/* Link Controls */}
            <div className="mt-3 pt-3 border-t border-editor-border/50">
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('controls.link')}</label>
              
              <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1 mb-2">
                {[
                  { value: 'manual', label: 'URL' },
                  { value: 'product', label: 'Producto' },
                  { value: 'collection', label: 'Colección' },
                  { value: 'content', label: 'Contenido' }
                ].map((type) => (
                  <button type="button"                     key={type.value}
                    onClick={() => {
                        setNestedData(`pricingLumina.tiers.${idx}.buttonLinkType`, type.value);
                        setNestedData(`pricingLumina.tiers.${idx}.buttonLink`, '');
                    }}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(tier.buttonLinkType || 'manual') === type.value
                      ? 'bg-editor-accent text-editor-bg'
                      : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {(tier.buttonLinkType === 'manual' || !tier.buttonLinkType) && (
                <>
                  <input
                    placeholder="https://example.com or #section"
                    value={tier.buttonLink || ''}
                    onChange={(e) => setNestedData(`pricingLumina.tiers.${idx}.buttonLink`, e.target.value)}
                    className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                  />
                  <p className="text-xs text-editor-text-secondary mt-1">
                    Use URLs for external links or # for page sections
                  </p>
                </>
              )}
              {tier.buttonLinkType === 'product' && (
                <SingleProductSelector
                  storeId={activeProject?.id || ''}
                  selectedProductId={tier.buttonLink?.startsWith('/product/') ? tier.buttonLink.split('/product/')[1] : undefined}
                  onSelect={(id) => {
                    if (id) {
                      setNestedData(`pricingLumina.tiers.${idx}.buttonLink`, `/product/${id}`);
                    } else {
                      setNestedData(`pricingLumina.tiers.${idx}.buttonLink`, '');
                    }
                  }}
                  label={t('editor.controls.common.selectProduct')}
                />
              )}
              {tier.buttonLinkType === 'collection' && (
                <SingleCollectionSelector
                  storeId={activeProject?.id || ''}
                  selectedCollectionId={tier.buttonLink?.startsWith('/collection/') ? tier.buttonLink.split('/collection/')[1] : undefined}
                  onSelect={(id) => {
                    if (id) {
                      setNestedData(`pricingLumina.tiers.${idx}.buttonLink`, `/collection/${id}`);
                    } else {
                      setNestedData(`pricingLumina.tiers.${idx}.buttonLink`, '');
                    }
                  }}
                  label={t('editor.controls.common.selectCollection')}
                />
              )}
              {tier.buttonLinkType === 'content' && (
                <SingleContentSelector
                  selectedContentPath={tier.buttonLink}
                  onSelect={(path) => {
                    setNestedData(`pricingLumina.tiers.${idx}.buttonLink`, path || '');
                  }}
                  label={t('editor.controls.common.selectContent')}
                />
              )}
            </div>

          </div>
        ))}

        <button
          onClick={() => {
            const newTier = { name: 'New Tier', price: '$99', period: '/mo', description: 'Description', features: ['Feature 1', 'Feature 2'], buttonText: 'Buy', buttonLink: '#' };
            setNestedData('pricingLumina.tiers', [...tiers, newTier]);
          }}
          className="w-full py-2 bg-editor-accent text-editor-bg rounded-md hover:bg-editor-accent/90 transition-colors flex items-center justify-center gap-2 font-medium text-sm mt-2"
        >
          <Plus size={16} /> {t('editor.pricingLumina.addTier', 'Add Tier')}
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
          checked={data?.pricingLumina?.glassEffect ?? true}
          onChange={(v) => setNestedData('pricingLumina.glassEffect', v)}
        />
      </div>

      <BackgroundImageControl sectionKey="pricingLumina" data={data} setNestedData={setNestedData} />
      
      {renderLuminaAnimationControls(data.pricingLumina, (key, value) => setNestedData(`pricingLumina.${key}`, value))}
      
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2">
            <Settings size={14} />
            {t('editor.controls.common.colors', 'Colors')}
          </label>
          <button
            onClick={() => {
              setNestedData('pricingLumina.colors', {});
              setNestedData('pricingLumina.glassEffect', true);
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
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={data.pricingLumina.colors?.panelBackground} onChange={(v) => setNestedData('pricingLumina.colors.panelBackground', v)} />
            <ColorControl label={t('editor.controls.colors.border', 'Border')} value={data.pricingLumina.colors?.panelBorder} onChange={(v) => setNestedData('pricingLumina.colors.panelBorder', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-editor-border/50">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">Textos</p>
            <ColorControl label="Fondo de Sección" value={data.pricingLumina.colors?.background} onChange={(v) => setNestedData('pricingLumina.colors.background', v)} />
            <ColorControl label={t('editor.controls.common.title', 'Heading')} value={data.pricingLumina.colors?.heading} onChange={(v) => setNestedData('pricingLumina.colors.heading', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={data.pricingLumina.colors?.text} onChange={(v) => setNestedData('pricingLumina.colors.text', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-editor-border/50">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">Botones</p>
            <ColorControl label="Fondo Primario" value={data.pricingLumina.colors?.primaryButtonBackground} onChange={(v) => setNestedData('pricingLumina.colors.primaryButtonBackground', v)} />
            <ColorControl label="Texto Primario" value={data.pricingLumina.colors?.primaryButtonText} onChange={(v) => setNestedData('pricingLumina.colors.primaryButtonText', v)} />
            <ColorControl label="Fondo Secundario" value={data.pricingLumina.colors?.secondaryButtonBackground} onChange={(v) => setNestedData('pricingLumina.colors.secondaryButtonBackground', v)} />
            <ColorControl label="Texto Secundario" value={data.pricingLumina.colors?.secondaryButtonText} onChange={(v) => setNestedData('pricingLumina.colors.secondaryButtonText', v)} />
          </div>
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
