import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { ControlsDeps, BackgroundImageControl, TopDotsControl } from '../ControlsShared';
import { Type, Settings, Layout, RotateCcw, Link, Maximize2 } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { ToggleControl, SliderControl, Input, TextArea, Select } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { SingleProductSelector, SingleCollectionSelector, SingleContentSelector } from '../../ui/EcommerceControls';

export const renderCtaNeonControls = (deps: ControlsDeps) => {
    const { data, setNestedData, setAiAssistField, t } = deps;
    const sectionData = data?.ctaNeon || {};

    const renderLinkBuilder = (
        prefix: 'primary' | 'secondary', 
        typeKey: string, 
        linkKey: string, 
        textKey: string,
        label: string
      ) => {
        const linkType = sectionData[typeKey] || 'section';
        return (
          <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
            <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
              <Link size={14} />
              {label}
            </label>
            
            <div className="mb-4">
                <Input 
                  label={t('editor.ctaNeon.buttonText', 'Texto del Botón')} 
                  value={sectionData[textKey] || ''} 
                  onChange={(e) => setNestedData(`ctaNeon.${textKey}`, e.target.value)} 
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
                <button type="button"                   
                  key={type.value}
                  onClick={() => {
                    setNestedData(`ctaNeon.${typeKey}`, type.value);
                    if (type.value === 'section') {
                      setNestedData(`ctaNeon.${linkKey}`, '/#cta');
                    } else if (type.value !== 'manual') {
                      setNestedData(`ctaNeon.${linkKey}`, '');
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
                  value={sectionData[linkKey] || '/#cta'}
                  onChange={(v) => setNestedData(`ctaNeon.${linkKey}`, v)}
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
                value={sectionData[linkKey] || ''}
                onChange={(v) => setNestedData(`ctaNeon.${linkKey}`, v)}
                placeholder="https://... o /pagina"
                className="mb-0"
              />
            )}
    
            {/* Product Picker */}
            {linkType === 'product' && (
              <SingleProductSelector
                selectedProductId={sectionData[linkKey]?.replace('/product/', '') || ''}
                onSelect={(id) => setNestedData(`ctaNeon.${linkKey}`, id ? `/product/${id}` : '')}
                label="Seleccionar Producto"
              />
            )}
    
            {/* Collection Picker */}
            {linkType === 'collection' && (
              <SingleCollectionSelector
                selectedCollectionId={sectionData[linkKey]?.replace('/collection/', '') || ''}
                onSelect={(id) => setNestedData(`ctaNeon.${linkKey}`, id ? `/collection/${id}` : '')}
                label="Seleccionar Colección"
              />
            )}
    
            {/* Content Picker */}
            {linkType === 'content' && (
              <SingleContentSelector
                selectedContentPath={sectionData[linkKey] || ''}
                onSelect={(path) => setNestedData(`ctaNeon.${linkKey}`, path || '')}
                label="Seleccionar Contenido CMS"
              />
            )}
          </div>
        );
    };

    const contentTab = (
        <div className="space-y-6">
            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase flex items-center gap-2">
                    <Type size={14} /> {t('editor.controls.typography', 'Textos Principales')}
                </label>
                
                <AIFormControl 
                    label={t('editor.controls.headline', 'Titular')}
                    onAssistClick={() => setAiAssistField({ 
                        path: 'ctaNeon.headline', 
                        value: sectionData.headline, 
                        context: 'CTA Neon Headline' 
                    })}
                >
                    <TextArea
                        value={sectionData.headline || ''}
                        onChange={(e) => setNestedData('ctaNeon.headline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>

                <AIFormControl 
                    label={t('editor.controls.subheadline', 'Subtitular')}
                    onAssistClick={() => setAiAssistField({ 
                        path: 'ctaNeon.subheadline', 
                        value: sectionData.subheadline, 
                        context: 'CTA Neon Subheadline' 
                    })}
                >
                    <TextArea
                        value={sectionData.subheadline || ''}
                        onChange={(e) => setNestedData('ctaNeon.subheadline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>
            </div>

            {renderLinkBuilder('primary', 'primaryCtaLinkType', 'primaryCtaLink', 'primaryCta', t('editor.ctaNeon.primaryCta', 'Botón Primario'))}
            {renderLinkBuilder('secondary', 'secondaryCtaLinkType', 'secondaryCtaLink', 'secondaryCta', t('editor.ctaNeon.secondaryCta', 'Botón Secundario'))}
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            {/* Background Image Setup */}
            <BackgroundImageControl sectionKey="ctaNeon" data={data} setNestedData={setNestedData} />

            <div className="bg-editor-panel-bg p-4 rounded-lg border border-editor-border space-y-4">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-2 flex items-center gap-2">
                    <Maximize2 size={14} /> Layout
                </label>
                <SliderControl
                    label={t('editor.controls.sectionHeight', 'Altura de la Sección (vh)')}
                    value={sectionData.sectionHeight || 70}
                    onChange={(v) => setNestedData('ctaNeon.sectionHeight', v)}
                    min={50} max={120} step={5} suffix="vh"
                />
                <div className="mt-3">
                  <Select
                    label={t('editor.controls.cardBorderRadius', 'Curvatura de Tarjeta')}
                    value={sectionData.cardBorderRadius || '3xl'}
                    onChange={(v) => setNestedData('ctaNeon.cardBorderRadius', v)}
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
                    onChange={(checked) => setNestedData('ctaNeon.glassEffect', checked)}
                />
                <ToggleControl
                    label={t('editor.controls.showBackgroundGrid', 'Mostrar Cuadrícula de Fondo')}
                    checked={sectionData.showBackgroundGrid !== false}
                    onChange={(checked) => setNestedData('ctaNeon.showBackgroundGrid', checked)}
                />
                <TopDotsControl sectionKey="ctaNeon" data={data} setNestedData={setNestedData} />
                <div>
                    <label className="block text-xs text-editor-text-secondary mb-1">
                        {t('editor.heroNeonControls.glowIntensity', 'Intensidad de Resplandor Neon')}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={sectionData.glowIntensity !== undefined ? sectionData.glowIntensity : 60}
                        onChange={(e) => setNestedData('ctaNeon.glowIntensity', parseInt(e.target.value))}
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
                            setNestedData('ctaNeon.colors', undefined);
                            setNestedData('ctaNeon.glassEffect', undefined);
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
                    onChange={(color) => setNestedData('ctaNeon.colors.background', color)}
                />
                <ColorControl
                    label={t('editor.controls.cardBackground', 'Fondo de Tarjeta')}
                    value={sectionData.colors?.cardBackground || '#141414'}
                    onChange={(color) => setNestedData('ctaNeon.colors.cardBackground', color)}
                />
                <ColorControl
                    label={t('editor.controls.headingColor', 'Color de Títulos')}
                    value={sectionData.colors?.heading || '#ffffff'}
                    onChange={(color) => setNestedData('ctaNeon.colors.heading', color)}
                />
                <ColorControl
                    label={t('editor.controls.textColor', 'Color de Texto')}
                    value={sectionData.colors?.text || '#a1a1aa'}
                    onChange={(color) => setNestedData('ctaNeon.colors.text', color)}
                />
                <ColorControl
                    label={t('editor.heroNeonControls.neonGlowColor', 'Color de Neón Principal')}
                    value={sectionData.colors?.neonGlow || '#FBB92B'}
                    onChange={(color) => setNestedData('ctaNeon.colors.neonGlow', color)}
                />
                <div className="space-y-2 pt-2 border-t border-editor-border/50">
                    <p className="text-[10px] uppercase font-bold text-editor-text-secondary/70 mb-1">{t('editor.controls.colors.primaryButton', 'Botón Primario')}</p>
                    <ColorControl label={t('editor.controls.common.background', 'Fondo del Botón')} value={sectionData.colors?.buttonBackground} onChange={(v) => setNestedData('ctaNeon.colors.buttonBackground', v)} />
                    <ColorControl label={t('editor.controls.common.text', 'Texto del Botón')} value={sectionData.colors?.buttonText} onChange={(v) => setNestedData('ctaNeon.colors.buttonText', v)} />
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
