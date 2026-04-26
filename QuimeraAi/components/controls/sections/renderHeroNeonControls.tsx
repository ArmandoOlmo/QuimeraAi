import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, Select, ToggleControl, SliderControl } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { ControlsDeps, BackgroundImageControl } from '../ControlsShared';
import { Type, Link, Settings, Layout, Layers, RotateCcw, Trash2, Plus, Image as ImageIcon, Maximize2 } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { SingleProductSelector, SingleCollectionSelector, SingleContentSelector } from '../../ui/EcommerceControls';
import ImagePicker from '../../ui/ImagePicker';

export const renderHeroNeonControls = (deps: ControlsDeps) => {
  const { data, setNestedData, setAiAssistField, t } = deps;
  const sectionData = data?.heroNeon || {};

  let slides = sectionData.slides;
  if (!slides || slides.length === 0) {
    slides = [
      {
        headline: sectionData.headline || '',
        subheadline: sectionData.subheadline || '',
        primaryCta: sectionData.primaryCta || '',
        secondaryCta: sectionData.secondaryCta || '',
        primaryCtaLink: sectionData.primaryCtaLink || '',
        primaryCtaLinkType: sectionData.primaryCtaLinkType || 'section',
        secondaryCtaLink: sectionData.secondaryCtaLink || '',
        secondaryCtaLinkType: sectionData.secondaryCtaLinkType || 'section',
        imageUrl: '',
      }
    ];
  }

  const renderLinkBuilder = (
    index: number,
    prefix: 'primary' | 'secondary', 
    typeKey: string, 
    linkKey: string, 
    textKey: string,
    label: string
  ) => {
    const slide = slides![index] as any;
    const linkType = slide[typeKey] || 'section';
    
    return (
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border mt-3">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Link size={14} />
          {label}
        </label>
        
        <div className="mb-4">
            <Input 
              label={t('editor.heroNeonControls.buttonText', 'Texto del Botón')} 
              value={slide[textKey] || ''} 
              onChange={(e) => setNestedData(`heroNeon.slides.${index}.${textKey}`, e.target.value)} 
            />
        </div>

        {/* Link Type Selector */}
        <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3 flex-wrap">
          {[
            { value: 'section', label: 'Sección' },
            { value: 'product', label: 'Producto' },
            { value: 'collection', label: 'Colección' },
            { value: 'content', label: 'Contenido' },
            { value: 'manual', label: 'URL' },
          ].map(type => (
            <button type="button" key={type.value}
              onClick={() => {
                setNestedData(`heroNeon.slides.${index}.${typeKey}`, type.value);
                if (type.value === 'section') {
                  setNestedData(`heroNeon.slides.${index}.${linkKey}`, '/#cta');
                } else if (type.value !== 'manual') {
                  setNestedData(`heroNeon.slides.${index}.${linkKey}`, '');
                }
              }}
              className={`flex-1 min-w-[60px] py-1.5 text-[10px] font-medium rounded-sm transition-colors ${linkType === type.value
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
              value={slide[linkKey] || '/#cta'}
              onChange={(e) => setNestedData(`heroNeon.slides.${index}.${linkKey}`, e.target.value)}
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
                { value: '/#leads', label: 'Leads' },
                { value: '/tienda', label: 'Tienda' },
              ]}
              noMargin
            />
        )}

        {/* Manual URL Input */}
        {linkType === 'manual' && (
          <Input
            label=""
            value={slide[linkKey] || ''}
            onChange={(e) => setNestedData(`heroNeon.slides.${index}.${linkKey}`, e.target.value)}
            placeholder="https://... o /pagina"
            className="mb-0"
          />
        )}

        {/* Product Picker */}
        {linkType === 'product' && (
          <SingleProductSelector
            selectedProductId={slide[linkKey]?.replace('/product/', '') || ''}
            onSelect={(id) => setNestedData(`heroNeon.slides.${index}.${linkKey}`, id ? `/product/${id}` : '')}
            label="Seleccionar Producto"
          />
        )}

        {/* Collection Picker */}
        {linkType === 'collection' && (
          <SingleCollectionSelector
            selectedCollectionId={slide[linkKey]?.replace('/collection/', '') || ''}
            onSelect={(id) => setNestedData(`heroNeon.slides.${index}.${linkKey}`, id ? `/collection/${id}` : '')}
            label="Seleccionar Colección"
          />
        )}

        {/* Content Picker */}
        {linkType === 'content' && (
          <SingleContentSelector
            selectedContentPath={slide[linkKey] || ''}
            onSelect={(path) => setNestedData(`heroNeon.slides.${index}.${linkKey}`, path || '')}
            label="Seleccionar Contenido CMS"
          />
        )}
      </div>
    );
  };

  const contentTab = (
    <div className="space-y-4">
      {/* ========== TEXT LAYOUT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          {t('editor.controls.textLayout.label', 'Text Layout')}
        </label>
        <div className="relative bg-editor-bg rounded-lg border border-editor-border p-3">
          <div className="relative aspect-video bg-gradient-to-br from-editor-panel-bg to-editor-bg rounded-md border border-editor-border/50 overflow-hidden mb-2">
            {(() => {
              const tl = sectionData.textPosition || 'bottom-left';
              const isLeft = tl.endsWith('-left');
              const isRight = tl.endsWith('-right');
              const isTop = tl.startsWith('top-');
              const isBottom = tl.startsWith('bottom-');
              const hPos = isLeft ? 'left-3' : isRight ? 'right-3' : 'left-1/2 -translate-x-1/2';
              const vPos = isTop ? 'top-2.5' : isBottom ? 'bottom-2.5' : 'top-1/2 -translate-y-1/2';
              const textAlign = isLeft ? 'items-start' : isRight ? 'items-end' : 'items-center';
              return (
                <div className={`absolute ${hPos} ${vPos} flex flex-col gap-1 ${textAlign} transition-all duration-300 ease-out`}>
                  <div className="h-1.5 w-14 rounded-full bg-editor-accent/80" />
                  <div className="h-1 w-10 rounded-full bg-editor-accent/40" />
                  <div className="h-1 w-8 rounded-full bg-editor-accent/25" />
                </div>
              );
            })()}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {([
              { value: 'top-left', label: 'Top Left' },
              { value: 'top-right', label: 'Top Right' },
              { value: 'bottom-left', label: 'Bottom Left' },
              { value: 'bottom-right', label: 'Bottom Right' },
            ] as const).map(pos => {
              const isSelected = (sectionData.textPosition || 'bottom-left') === pos.value;
              return (
                <button type="button" key={pos.value}
                  onClick={() => setNestedData('heroNeon.textPosition', pos.value)}
                  className={`flex items-center justify-center h-8 rounded text-xs transition-all duration-200 ${
                    isSelected
                      ? 'bg-editor-accent/20 border border-editor-accent/50 text-editor-accent'
                      : 'bg-editor-panel-bg/50 border border-transparent hover:bg-editor-border/50 hover:border-editor-border text-editor-text-secondary'
                  }`}
                >
                  {pos.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Font Overrides */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('editor.controls.fonts', 'Fuentes (Global para Neon)')}
        </label>
        <div className="space-y-3">
          <Select
            label="Headline Font Override"
            value={sectionData.headlineFont || ''}
            onChange={(e) => setNestedData('heroNeon.headlineFont', e.target.value)}
            options={[
                { value: '', label: 'Default Theme Font' },
                { value: 'ubuntu', label: 'Ubuntu' },
                { value: 'plus-jakarta-sans', label: 'Plus Jakarta Sans' },
                { value: 'playfair-display', label: 'Playfair Display' },
                { value: 'outfit', label: 'Outfit' },
                { value: 'space-grotesk', label: 'Space Grotesk' }
            ]}
          />
          <Select
            label="Subheadline Font Override"
            value={sectionData.subheadlineFont || ''}
            onChange={(e) => setNestedData('heroNeon.subheadlineFont', e.target.value)}
            options={[
                { value: '', label: 'Default Theme Font' },
                { value: 'ubuntu', label: 'Ubuntu' },
                { value: 'plus-jakarta-sans', label: 'Plus Jakarta Sans' },
                { value: 'playfair-display', label: 'Playfair Display' },
                { value: 'outfit', label: 'Outfit' },
                { value: 'space-grotesk', label: 'Space Grotesk' }
            ]}
          />
        </div>
      </div>

      {/* Slides Content */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers size={14} />
          Slides
        </label>
        {slides.map((slide: any, index: number) => (
          <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-editor-text-secondary">Slide #{index + 1}</span>
              {slides!.length > 1 && (
                <button type="button" onClick={() => {
                    const newSlides = slides!.filter((_: any, i: number) => i !== index);
                    setNestedData('heroNeon.slides', newSlides);
                  }}
                  className="text-editor-text-secondary hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            
            {/* Slide Image inside the card */}
            <div className="mb-3">
              <ImagePicker
                label="Imagen dentro de la tarjeta"
                value={slide.imageUrl || ''}
                onChange={(url) => setNestedData(`heroNeon.slides.${index}.imageUrl`, url)}
                onRemove={() => setNestedData(`heroNeon.slides.${index}.imageUrl`, '')}
              />
            </div>

            <AIFormControl 
              label={t('editor.heroNeonControls.headline', 'Headline')} 
              onAssistClick={() => setAiAssistField({ path: `heroNeon.slides.${index}.headline`, value: slide.headline, context: 'Hero Neon Headline' })}
            >
              <TextArea 
                value={slide.headline || ''} 
                onChange={(e) => setNestedData(`heroNeon.slides.${index}.headline`, e.target.value)} 
                rows={2} 
              />
            </AIFormControl>

            <AIFormControl 
              label={t('editor.heroNeonControls.subheadline', 'Subheadline')} 
              onAssistClick={() => setAiAssistField({ path: `heroNeon.slides.${index}.subheadline`, value: slide.subheadline || '', context: 'Hero Neon Subheadline' })}
            >
              <TextArea 
                value={slide.subheadline || ''} 
                onChange={(e) => setNestedData(`heroNeon.slides.${index}.subheadline`, e.target.value)} 
                rows={3} 
              />
            </AIFormControl>

            {/* Slide Links */}
            {renderLinkBuilder(index, 'primary', 'primaryCtaLinkType', 'primaryCtaLink', 'primaryCta', t('editor.heroNeonControls.primaryCta', 'Primary Button'))}
            {renderLinkBuilder(index, 'secondary', 'secondaryCtaLinkType', 'secondaryCtaLink', 'secondaryCta', t('editor.heroNeonControls.secondaryCta', 'Secondary Button'))}
          </div>
        ))}

        <button type="button" onClick={() => {
            const newSlide = { headline: 'Nuevo Titular', subheadline: 'Nuevo Subtitular', primaryCta: 'Explorar' };
            setNestedData('heroNeon.slides', [...slides!, newSlide]);
          }}
          className="w-full py-2 mt-2 bg-editor-panel-bg border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> Añadir Slide
        </button>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* Background Image Setup */}
      <BackgroundImageControl sectionKey="heroNeon" data={data} setNestedData={setNestedData} />

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-4 mb-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2 mb-2">
            <Maximize2 size={14} /> Layout
        </label>
        <SliderControl
            label={t('editor.controls.sectionHeight', 'Altura de la Sección (vh)')}
            value={sectionData.sectionHeight || 90}
            onChange={(v) => setNestedData('heroNeon.sectionHeight', v)}
            min={50} max={100} step={5} suffix="vh"
        />
        <div className="mt-3">
          <Select
            label={t('editor.controls.cardBorderRadius', 'Curvatura de Tarjeta')}
            value={sectionData.cardBorderRadius || '3xl'}
            onChange={(e) => setNestedData('heroNeon.cardBorderRadius', e.target.value)}
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

      {/* ========== GLASSMORPHISM & EFFECTS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-4 mb-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efectos Visuales
        </label>
        <ToggleControl
          label={t('controls.glassmorphismTransparencia', 'Transparencia (Glassmorphism)')}
          checked={sectionData.glassEffect ?? true}
          onChange={(v) => setNestedData('heroNeon.glassEffect', v)}
        />
        <ToggleControl
          label="Mostrar Indicadores Superiores (Dots)"
          checked={sectionData.showTopDots ?? true}
          onChange={(v) => setNestedData('heroNeon.showTopDots', v)}
        />
        {sectionData.showTopDots !== false && (
          <div className="space-y-2 mt-2 p-3 bg-editor-bg border border-editor-border rounded-lg">
            <label className="block text-[10px] font-bold text-editor-text-secondary uppercase">Colores de los Dots (Máx 6)</label>
            <div className="flex flex-wrap gap-2">
              {(sectionData.dotColors || ['#FF5F56', '#FFBD2E', '#27C93F', '#4A90E2', '#E14EAA', '#F8E71C']).map((color: string, i: number) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...(sectionData.dotColors || ['#FF5F56', '#FFBD2E', '#27C93F', '#4A90E2', '#E14EAA', '#F8E71C'])];
                      newColors[i] = e.target.value;
                      setNestedData('heroNeon.dotColors', newColors);
                    }}
                    className="w-8 h-8 rounded border-none cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <ToggleControl
          label="Mostrar Líneas de Neón"
          checked={sectionData.showNeonLines ?? true}
          onChange={(v) => setNestedData('heroNeon.showNeonLines', v)}
        />
        {sectionData.showNeonLines !== false && (
          <div className="space-y-3 mt-2 p-3 bg-editor-bg border border-editor-border rounded-lg">
            <Select
              label="Estilo de Líneas"
              value={sectionData.neonLineStyle || 'stacked'}
              onChange={(e) => setNestedData('heroNeon.neonLineStyle', e.target.value)}
              options={[
                { value: 'minimal', label: 'Minimalista (2 líneas)' },
                { value: 'stacked', label: 'Apilado (5 líneas)' }
              ]}
            />
            <Select
              label="Posición de Líneas"
              value={sectionData.neonLinePosition || 'top-right'}
              onChange={(e) => setNestedData('heroNeon.neonLinePosition', e.target.value)}
              options={[
                { value: 'top-left', label: 'Superior Izquierda' },
                { value: 'top-right', label: 'Superior Derecha' },
                { value: 'bottom-left', label: 'Inferior Izquierda' },
                { value: 'bottom-right', label: 'Inferior Derecha' }
              ]}
            />
            <div>
              <label className="block text-[10px] font-bold text-editor-text-secondary uppercase mb-2">Colores de Líneas de Neón</label>
              <div className="flex flex-wrap gap-2">
                {(sectionData.neonLineColors || ['#FF5F56', '#FFBD2E', '#27C93F', '#4A90E2', '#E14EAA']).slice(0, sectionData.neonLineStyle === 'minimal' ? 2 : 5).map((color: string, i: number) => (
                  <input
                    key={i}
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...(sectionData.neonLineColors || ['#FF5F56', '#FFBD2E', '#27C93F', '#4A90E2', '#E14EAA'])];
                      newColors[i] = e.target.value;
                      setNestedData('heroNeon.neonLineColors', newColors);
                    }}
                    className="w-8 h-8 rounded border-none cursor-pointer"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-editor-text-secondary">Neon Glow Intensity</label>
            <input 
                type="range" 
                min="0" max="100" 
                value={sectionData.glowIntensity ?? 50} 
                onChange={(e) => setNestedData('heroNeon.glowIntensity', parseInt(e.target.value, 10))}
                className="w-full accent-editor-accent"
            />
        </div>
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2">
            <Settings size={14} />
            {t('editor.controls.common.colors', 'Colors')}
          </label>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">{t('editor.controls.colors.panel', 'Panel & Glow')}</p>
            <ColorControl label="Background" value={sectionData.colors?.background} onChange={(v) => setNestedData('heroNeon.colors.background', v)} />
            <ColorControl label="Card Background" value={sectionData.colors?.cardBackground} onChange={(v) => setNestedData('heroNeon.colors.cardBackground', v)} />
            <ColorControl label="Neon Glow Color" value={sectionData.colors?.neonGlow} onChange={(v) => setNestedData('heroNeon.colors.neonGlow', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-editor-border/50">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">{t('editor.controls.colors.typography', 'Typography')}</p>
            <ColorControl label={t('editor.controls.common.title', 'Title')} value={sectionData.colors?.heading} onChange={(v) => setNestedData('heroNeon.colors.heading', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={sectionData.colors?.text} onChange={(v) => setNestedData('heroNeon.colors.text', v)} />
          </div>

          <div className="space-y-2 pt-2 border-t border-editor-border/50">
            <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">{t('editor.controls.colors.primaryButton', 'Primary Button')}</p>
            <ColorControl label={t('editor.controls.common.background', 'Background')} value={sectionData.colors?.buttonBackground} onChange={(v) => setNestedData('heroNeon.colors.buttonBackground', v)} />
            <ColorControl label={t('editor.controls.common.text', 'Text')} value={sectionData.colors?.buttonText} onChange={(v) => setNestedData('heroNeon.colors.buttonText', v)} />
          </div>
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
