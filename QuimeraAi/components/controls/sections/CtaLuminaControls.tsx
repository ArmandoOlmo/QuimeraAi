import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, Select, ToggleControl } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { renderLuminaAnimationControls } from './LuminaSharedControls';
import { Type, Link, Settings, Layers, RotateCcw } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { SingleProductSelector, SingleCollectionSelector, SingleContentSelector } from '../../ui/EcommerceControls';

export const renderCtaLuminaControls = (deps: ControlsDeps) => {
  const { data, setNestedData, setAiAssistField, t } = deps;
  if (!data?.ctaLumina) return null;

  const renderLinkBuilder = (
    prefix: 'primary' | 'secondary', 
    typeKey: string, 
    linkKey: string, 
    textKey: string,
    label: string
  ) => {
    const linkType = data.ctaLumina[typeKey] || 'section';
    return (
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Link size={14} />
          {label}
        </label>
        
        <div className="mb-4">
            <Input 
              label={t('editor.ctaLumina.buttonText', 'Texto del Botón')} 
              value={data.ctaLumina[textKey] || ''} 
              onChange={(e) => setNestedData(`ctaLumina.${textKey}`, e.target.value)} 
            />
        </div>

        {/* Link Type Selector */}
        <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
          {[
            { value: 'section', label: 'Sección' },
            { value: 'product', label: 'Producto' },
            { value: 'collection', label: 'Colección' },
            { value: 'content', label: 'Contenido' },
            { value: 'manual', label: 'URL' },
          ].map(type => (
            <button type="button"               key={type.value}
              onClick={() => {
                setNestedData(`ctaLumina.${typeKey}`, type.value);
                if (type.value === 'section') {
                  setNestedData(`ctaLumina.${linkKey}`, '/#cta');
                } else if (type.value !== 'manual') {
                  setNestedData(`ctaLumina.${linkKey}`, '');
                }
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${linkType === type.value
                ? 'bg-editor-accent text-editor-bg'
                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Section Selector */}
        {linkType === 'section' && (
            <Select
              value={data.ctaLumina[linkKey] || '/#cta'}
              onChange={(e) => setNestedData(`ctaLumina.${linkKey}`, e.target.value)}
              options={[
                { value: '/', label: 'Inicio' },
                { value: '/#features', label: 'Features' },
                { value: '/#services', label: 'Services' },
                { value: '/#pricing', label: 'Pricing' },
                { value: '/#testimonials', label: 'Testimonials' },
                { value: '/#team', label: 'Team' },
                { value: '/#faq', label: 'FAQ' },
                { value: '/#contact', label: 'Contact' },
                { value: '/#cta', label: 'CTA' },
                { value: '/#portfolio', label: 'Portfolio' },
                { value: '/#heroSplit', label: 'Hero Split' },
                { value: '/#leads', label: 'Leads' },
                { value: '/#newsletter', label: 'Newsletter' },
                { value: '/#howItWorks', label: 'How It Works' },
                { value: '/#video', label: 'Video' },
                { value: '/#slideshow', label: 'Slideshow' },
                { value: '/#map', label: 'Map' },
                { value: '/#menu', label: 'Menu' },
                { value: '/#banner', label: 'Banner' },
                { value: '/#products', label: 'Products' },
                { value: '/tienda', label: 'Tienda' },
              ]}
              noMargin
            />
        )}

        {/* Manual URL Input */}
        {linkType === 'manual' && (
          <Input
            label=""
            value={data.ctaLumina[linkKey] || ''}
            onChange={(e) => setNestedData(`ctaLumina.${linkKey}`, e.target.value)}
            placeholder="https://... o /pagina"
            className="mb-0"
          />
        )}

        {/* Product Picker */}
        {linkType === 'product' && (
          <SingleProductSelector
            selectedProductId={data.ctaLumina[linkKey]?.replace('/product/', '') || ''}
            onSelect={(id) => setNestedData(`ctaLumina.${linkKey}`, id ? `/product/${id}` : '')}
            label="Seleccionar Producto"
          />
        )}

        {/* Collection Picker */}
        {linkType === 'collection' && (
          <SingleCollectionSelector
            selectedCollectionId={data.ctaLumina[linkKey]?.replace('/collection/', '') || ''}
            onSelect={(id) => setNestedData(`ctaLumina.${linkKey}`, id ? `/collection/${id}` : '')}
            label="Seleccionar Colección"
          />
        )}

        {/* Content Picker */}
        {linkType === 'content' && (
          <SingleContentSelector
            selectedContentPath={data.ctaLumina[linkKey] || ''}
            onSelect={(path) => setNestedData(`ctaLumina.${linkKey}`, path || '')}
            label="Seleccionar Contenido CMS"
          />
        )}
      </div>
    );
  };

  const contentTab = (
    <div className="space-y-4">
      {/* Text Content */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('editor.ctaLumina.content', 'Text Content')}
        </label>
        
        <div className="space-y-4">
          <AIFormControl 
            label={t('editor.ctaLumina.headline', 'Headline')} 
            onAssistClick={() => setAiAssistField({ path: 'ctaLumina.headline', value: data.ctaLumina.headline, context: 'CTA Lumina Headline' })}
          >
            <TextArea 
              value={data.ctaLumina.headline || ''} 
              onChange={(e) => setNestedData('ctaLumina.headline', e.target.value)} 
              rows={2} 
            />
          </AIFormControl>

          <AIFormControl 
            label={t('editor.ctaLumina.subheadline', 'Subheadline')} 
            onAssistClick={() => setAiAssistField({ path: 'ctaLumina.subheadline', value: data.ctaLumina.subheadline || '', context: 'CTA Lumina Subheadline' })}
          >
            <Input 
              label="" 
              value={data.ctaLumina.subheadline || ''} 
              onChange={(e) => setNestedData('ctaLumina.subheadline', e.target.value)} 
            />
          </AIFormControl>
        </div>
      </div>

      {/* Primary CTA */}
      {renderLinkBuilder('primary', 'primaryCtaLinkType', 'primaryCtaLink', 'primaryCta', t('editor.ctaLumina.primaryCta', 'Primary Button'))}

      {/* Secondary CTA */}
      {renderLinkBuilder('secondary', 'secondaryCtaLinkType', 'secondaryCtaLink', 'secondaryCta', t('editor.ctaLumina.secondaryCta', 'Secondary Button'))}
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
          checked={data?.ctaLumina?.glassEffect ?? true}
          onChange={(v) => setNestedData('ctaLumina.glassEffect', v)}
        />
      </div>

      <BackgroundImageControl sectionKey="ctaLumina" data={data} setNestedData={setNestedData} />
      
      {renderLuminaAnimationControls(data.ctaLumina, (key, value) => setNestedData(`ctaLumina.${key}`, value))}
      
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2">
            <Settings size={14} />
            {t('editor.controls.common.colors', 'Colors')}
          </label>
          <button
            onClick={() => {
              setNestedData('ctaLumina.colors', {});
              setNestedData('ctaLumina.glassEffect', true);
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
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={data.ctaLumina.colors?.panelBackground} onChange={(v) => setNestedData('ctaLumina.colors.panelBackground', v)} />
            <ColorControl label={t('editor.controls.colors.border', 'Border')} value={data.ctaLumina.colors?.panelBorder} onChange={(v) => setNestedData('ctaLumina.colors.panelBorder', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-editor-border/50">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">Textos</p>
            <ColorControl label="Fondo de Sección" value={data.ctaLumina.colors?.background} onChange={(v) => setNestedData('ctaLumina.colors.background', v)} />
            <ColorControl label={t('editor.controls.common.title', 'Heading')} value={data.ctaLumina.colors?.heading} onChange={(v) => setNestedData('ctaLumina.colors.heading', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={data.ctaLumina.colors?.text} onChange={(v) => setNestedData('ctaLumina.colors.text', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-editor-border/50">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">Botones</p>
            <ColorControl label="Fondo Primario" value={data.ctaLumina.colors?.primaryButtonBackground} onChange={(v) => setNestedData('ctaLumina.colors.primaryButtonBackground', v)} />
            <ColorControl label="Texto Primario" value={data.ctaLumina.colors?.primaryButtonText} onChange={(v) => setNestedData('ctaLumina.colors.primaryButtonText', v)} />
            <ColorControl label="Fondo Secundario" value={data.ctaLumina.colors?.secondaryButtonBackground} onChange={(v) => setNestedData('ctaLumina.colors.secondaryButtonBackground', v)} />
            <ColorControl label="Texto Secundario" value={data.ctaLumina.colors?.secondaryButtonText} onChange={(v) => setNestedData('ctaLumina.colors.secondaryButtonText', v)} />
          </div>
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
