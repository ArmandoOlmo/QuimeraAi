import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, Select, ToggleControl , I18nInput, I18nTextArea } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { renderLuminaAnimationControls } from './LuminaSharedControls';
import { Type, Link, Settings, Layout, Layers, RotateCcw } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { SingleProductSelector, SingleCollectionSelector, SingleContentSelector } from '../../ui/EcommerceControls';

export const renderHeroLuminaControls = (deps: ControlsDeps) => {
  const { data, setNestedData, setAiAssistField, t } = deps;
  if (!data?.heroLumina) return null;

  const renderLinkBuilder = (
    prefix: 'primary' | 'secondary', 
    typeKey: string, 
    linkKey: string, 
    textKey: string,
    label: string
  ) => {
    const linkType = data.heroLumina[typeKey] || 'section';
    return (
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Link size={14} />
          {label}
        </label>
        
        <div className="mb-4">
            <I18nInput 
              label={t('editor.heroLumina.buttonText', 'Texto del Botón')} 
              value={data.heroLumina[textKey] || ''} 
              onChange={(val) => setNestedData(`heroLumina.${textKey}`, val)} 
            />
        </div>

        {/* Link Type Selector */}
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border mb-3">
          {[
            { value: 'section', label: 'Sección' },
            { value: 'product', label: 'Producto' },
            { value: 'collection', label: 'Colección' },
            { value: 'content', label: 'Contenido' },
            { value: 'manual', label: 'URL' },
          ].map(type => (
            <button type="button"               key={type.value}
              onClick={() => {
                setNestedData(`heroLumina.${typeKey}`, type.value);
                if (type.value === 'section') {
                  setNestedData(`heroLumina.${linkKey}`, '/#cta');
                } else if (type.value !== 'manual') {
                  setNestedData(`heroLumina.${linkKey}`, '');
                }
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${linkType === type.value
                ? 'bg-q-accent text-q-bg'
                : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Section Selector */}
        {linkType === 'section' && (
            <Select
              value={data.heroLumina[linkKey] || '/#cta'}
              onChange={(val) => setNestedData(`heroLumina.${linkKey}`, val)}
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
          <I18nInput
            label=""
            value={data.heroLumina[linkKey] || ''}
            onChange={(val) => setNestedData(`heroLumina.${linkKey}`, val)}
            placeholder="https://... o /pagina"
            className="mb-0"
          />
        )}

        {/* Product Picker */}
        {linkType === 'product' && (
          <SingleProductSelector
            selectedProductId={data.heroLumina[linkKey]?.replace('/product/', '') || ''}
            onSelect={(id) => setNestedData(`heroLumina.${linkKey}`, id ? `/product/${id}` : '')}
            label="Seleccionar Producto"
          />
        )}

        {/* Collection Picker */}
        {linkType === 'collection' && (
          <SingleCollectionSelector
            selectedCollectionId={data.heroLumina[linkKey]?.replace('/collection/', '') || ''}
            onSelect={(id) => setNestedData(`heroLumina.${linkKey}`, id ? `/collection/${id}` : '')}
            label="Seleccionar Colección"
          />
        )}

        {/* Content Picker */}
        {linkType === 'content' && (
          <SingleContentSelector
            selectedContentPath={data.heroLumina[linkKey] || ''}
            onSelect={(path) => setNestedData(`heroLumina.${linkKey}`, path || '')}
            label="Seleccionar Contenido CMS"
          />
        )}
      </div>
    );
  };

  const contentTab = (
    <div className="space-y-4">
      {/* ========== TEXT LAYOUT ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          {t('editor.controls.textLayout.label', 'Text Layout')}
        </label>
        <div className="relative bg-q-bg rounded-lg border border-q-border p-3">
          <div className="relative aspect-video bg-gradient-to-br from-editor-panel-bg to-editor-bg rounded-md border border-q-border/50 overflow-hidden mb-2">
            {(() => {
              const tl = data.heroLumina.textLayout || 'center';
              const isLeft = tl.startsWith('left');
              const isRight = tl.startsWith('right');
              const isTop = tl.endsWith('-top') || tl === 'center-top';
              const isBottom = tl.endsWith('-bottom') || tl === 'center-bottom';
              const hPos = isLeft ? 'left-3' : isRight ? 'right-3' : 'left-1/2 -translate-x-1/2';
              const vPos = isTop ? 'top-2.5' : isBottom ? 'bottom-2.5' : 'top-1/2 -translate-y-1/2';
              const textAlign = isLeft ? 'items-start' : isRight ? 'items-end' : 'items-center';
              return (
                <div className={`absolute ${hPos} ${vPos} flex flex-col gap-1 ${textAlign} transition-all duration-300 ease-out`}>
                  <div className="h-1.5 w-14 rounded-full bg-q-accent/80" />
                  <div className="h-1 w-10 rounded-full bg-q-accent/40" />
                  <div className="h-1 w-8 rounded-full bg-q-accent/25" />
                </div>
              );
            })()}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {([
              { value: 'left-top',      row: 0, col: 0 },
              { value: 'center-top',    row: 0, col: 1 },
              { value: 'right-top',     row: 0, col: 2 },
              { value: 'left-center',   row: 1, col: 0 },
              { value: 'center',        row: 1, col: 1 },
              { value: 'right-center',  row: 1, col: 2 },
              { value: 'left-bottom',   row: 2, col: 0 },
              { value: 'center-bottom', row: 2, col: 1 },
              { value: 'right-bottom',  row: 2, col: 2 },
            ] as const).map(pos => {
              const isSelected = (data.heroLumina.textLayout || 'center') === pos.value;
              return (
                <button type="button" key={pos.value}
                  onClick={() => setNestedData('heroLumina.textLayout', pos.value)}
                  className={`flex items-center justify-center h-7 rounded transition-all duration-200 ${
                    isSelected
                      ? 'bg-q-accent/20 border border-q-accent/50'
                      : 'bg-q-surface/50 border border-transparent hover:bg-q-surface-overlay/50 hover:border-q-border'
                  }`}
                  style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
                >
                  <div className={`rounded-full transition-all duration-200 ${
                    isSelected
                      ? 'w-2.5 h-2.5 bg-q-accent shadow-[0_0_8px_var(--editor-accent)]'
                      : 'w-1.5 h-1.5 bg-q-text-secondary/40'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('editor.heroLumina.content', 'Text Content')}
        </label>
        
        <div className="space-y-4">
          <AIFormControl 
            label={t('editor.heroLumina.headline', 'Headline')} 
            onAssistClick={() => setAiAssistField({ path: 'heroLumina.headline', value: data.heroLumina.headline, context: 'Hero Lumina Headline' })}
          >
            <I18nTextArea 
              value={data.heroLumina.headline || ''} 
              onChange={(val) => setNestedData('heroLumina.headline', val)} 
              rows={2} 
            />
          </AIFormControl>

          <AIFormControl 
            label={t('editor.heroLumina.subheadline', 'Subheadline')} 
            onAssistClick={() => setAiAssistField({ path: 'heroLumina.subheadline', value: data.heroLumina.subheadline || '', context: 'Hero Lumina Subheadline' })}
          >
            <I18nTextArea 
              value={data.heroLumina.subheadline || ''} 
              onChange={(val) => setNestedData('heroLumina.subheadline', val)} 
              rows={3} 
            />
          </AIFormControl>
        </div>
      </div>

      {/* Primary CTA */}
      {renderLinkBuilder('primary', 'primaryCtaLinkType', 'primaryCtaLink', 'primaryCta', t('editor.heroLumina.primaryCta', 'Primary Button'))}

      {/* Secondary CTA */}
      {renderLinkBuilder('secondary', 'secondaryCtaLinkType', 'secondaryCtaLink', 'secondaryCta', t('editor.heroLumina.secondaryCta', 'Secondary Button'))}
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
          checked={data?.heroLumina?.glassEffect ?? true}
          onChange={(v) => setNestedData('heroLumina.glassEffect', v)}
        />
      </div>

      <BackgroundImageControl sectionKey="heroLumina" data={data} setNestedData={setNestedData} />
      
      {renderLuminaAnimationControls(data.heroLumina, (key, value) => setNestedData(`heroLumina.${key}`, value))}
      
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2">
            <Settings size={14} />
            {t('editor.controls.common.colors', 'Colors')}
          </label>
          <button
            onClick={() => {
              setNestedData('heroLumina.colors', {});
              setNestedData('heroLumina.glassEffect', true);
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
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={data.heroLumina.colors?.panelBackground} onChange={(v) => setNestedData('heroLumina.colors.panelBackground', v)} />
            <ColorControl label={t('editor.controls.colors.border', 'Border')} value={data.heroLumina.colors?.panelBorder} onChange={(v) => setNestedData('heroLumina.colors.panelBorder', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-q-border/50">
            <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.controls.colors.typography', 'Typography')}</p>
            <ColorControl label={t('editor.controls.common.title', 'Title')} value={data.heroLumina.colors?.heading} onChange={(v) => setNestedData('heroLumina.colors.heading', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={data.heroLumina.colors?.text} onChange={(v) => setNestedData('heroLumina.colors.text', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-q-border/50">
            <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.controls.colors.primaryButton', 'Primary Button')}</p>
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={data.heroLumina.colors?.primaryButtonBackground} onChange={(v) => setNestedData('heroLumina.colors.primaryButtonBackground', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={data.heroLumina.colors?.primaryButtonText} onChange={(v) => setNestedData('heroLumina.colors.primaryButtonText', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-q-border/50">
            <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.controls.colors.secondaryButton', 'Secondary Button')}</p>
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={data.heroLumina.colors?.secondaryButtonBackground} onChange={(v) => setNestedData('heroLumina.colors.secondaryButtonBackground', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={data.heroLumina.colors?.secondaryButtonText} onChange={(v) => setNestedData('heroLumina.colors.secondaryButtonText', v)} />
          </div>
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
