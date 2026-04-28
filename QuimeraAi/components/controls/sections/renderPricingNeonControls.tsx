import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import { ControlsDeps, BackgroundImageControl, TopDotsControl } from '../ControlsShared';
import { Type, Settings, Maximize2, RotateCcw, Trash2, Plus, List, CreditCard } from 'lucide-react';
import ColorControl from '../../ui/ColorControl';
import { ToggleControl, SliderControl, Input, TextArea, Select } from '../../ui/EditorControlPrimitives';
import AIFormControl from '../../ui/AIFormControl';
import { SingleProductSelector, SingleCollectionSelector, SingleContentSelector } from '../../ui/EcommerceControls';

export const renderPricingNeonControls = (deps: ControlsDeps) => {
    const { data, setNestedData, setAiAssistField, t } = deps;
    const sectionData = data?.pricingNeon || {};

    let tiers = sectionData.tiers;
    if (!tiers || !Array.isArray(tiers)) {
        tiers = [
            { name: 'Basic', price: '$19', billingPeriod: '/month', description: 'Perfect for getting started.', features: ['1 User', 'Basic Support', '10GB Storage'], buttonText: 'Start Basic', isPopular: false },
            { name: 'Pro', price: '$49', billingPeriod: '/month', description: 'Best for growing teams.', features: ['5 Users', 'Priority Support', '100GB Storage', 'Advanced Analytics'], buttonText: 'Start Pro', isPopular: true },
            { name: 'Enterprise', price: '$99', billingPeriod: '/month', description: 'For large scale operations.', features: ['Unlimited Users', '24/7 Support', 'Unlimited Storage', 'Custom Integrations'], buttonText: 'Contact Sales', isPopular: false }
        ];
    }

    const renderLinkBuilder = (
        tierIndex: number,
        typeKey: string, 
        linkKey: string, 
        textKey: string,
        label: string
      ) => {
        const linkType = tiers[tierIndex]?.[typeKey] || 'section';
        return (
          <div className="mt-4 pt-4 border-t border-q-border space-y-3">
            <label className="block text-xs font-bold text-q-text-secondary uppercase">
              {label}
            </label>
            
            <Input 
              label={t('editor.pricingNeon.buttonText', 'Texto del Botón')} 
              value={tiers[tierIndex]?.[textKey] || ''} 
              onChange={(e) => setNestedData(`pricingNeon.tiers.${tierIndex}.${textKey}`, e.target.value)} 
            />
    
            {/* Link Type Selector */}
            <div className="flex bg-q-bg p-1 rounded-md border border-q-border mb-3">
              {[
                { value: 'section', label: 'Sec' },
                { value: 'product', label: 'Prod' },
                { value: 'collection', label: 'Col' },
                { value: 'content', label: 'CMS' },
                { value: 'manual', label: 'URL' },
              ].map(type => (
                <button type="button"                   
                  key={type.value}
                  onClick={() => {
                    setNestedData(`pricingNeon.tiers.${tierIndex}.${typeKey}`, type.value);
                    if (type.value === 'section') {
                      setNestedData(`pricingNeon.tiers.${tierIndex}.${linkKey}`, '/#pricing');
                    } else if (type.value !== 'manual') {
                      setNestedData(`pricingNeon.tiers.${tierIndex}.${linkKey}`, '');
                    }
                  }}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-sm transition-colors ${linkType === type.value
                    ? 'bg-q-accent text-q-bg'
                    : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
    
            {/* Manual URL Input */}
            {linkType === 'manual' && (
              <Input
                label=""
                value={tiers[tierIndex]?.[linkKey] || ''}
                onChange={(v) => setNestedData(`pricingNeon.tiers.${tierIndex}.${linkKey}`, v)}
                placeholder="https://... o /pagina"
                className="mb-0"
              />
            )}
    
            {/* Product Picker */}
            {linkType === 'product' && (
              <SingleProductSelector
                selectedProductId={tiers[tierIndex]?.[linkKey]?.replace('/product/', '') || ''}
                onSelect={(id) => setNestedData(`pricingNeon.tiers.${tierIndex}.${linkKey}`, id ? `/product/${id}` : '')}
                label="Producto"
              />
            )}
    
            {/* Collection Picker */}
            {linkType === 'collection' && (
              <SingleCollectionSelector
                selectedCollectionId={tiers[tierIndex]?.[linkKey]?.replace('/collection/', '') || ''}
                onSelect={(id) => setNestedData(`pricingNeon.tiers.${tierIndex}.${linkKey}`, id ? `/collection/${id}` : '')}
                label="Colección"
              />
            )}
    
            {/* Content Picker */}
            {linkType === 'content' && (
              <SingleContentSelector
                selectedContentPath={tiers[tierIndex]?.[linkKey] || ''}
                onSelect={(path) => setNestedData(`pricingNeon.tiers.${tierIndex}.${linkKey}`, path || '')}
                label="Contenido CMS"
              />
            )}
          </div>
        );
    };

    const contentTab = (
        <div className="space-y-6">
            <div className="bg-q-surface p-4 rounded-lg border border-q-border space-y-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2">
                    <Type size={14} /> {t('editor.controls.typography', 'Textos Principales')}
                </label>
                
                <AIFormControl 
                    label={t('editor.controls.headline', 'Titular')}
                    onAssistClick={() => setAiAssistField({ 
                        path: 'pricingNeon.headline', 
                        value: sectionData.headline, 
                        context: 'Pricing Neon Headline' 
                    })}
                >
                    <TextArea
                        value={sectionData.headline || ''}
                        onChange={(e) => setNestedData('pricingNeon.headline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>

                <AIFormControl 
                    label={t('editor.controls.subheadline', 'Subtitular')}
                    onAssistClick={() => setAiAssistField({ 
                        path: 'pricingNeon.subheadline', 
                        value: sectionData.subheadline, 
                        context: 'Pricing Neon Subheadline' 
                    })}
                >
                    <TextArea
                        value={sectionData.subheadline || ''}
                        onChange={(e) => setNestedData('pricingNeon.subheadline', e.target.value)}
                        rows={2}
                    />
                </AIFormControl>
            </div>

            <div className="bg-q-surface p-4 rounded-lg border border-q-border space-y-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2 mb-4">
                    <CreditCard size={14} /> {t('editor.controls.pricingTiers', 'Planes de Precios')}
                </label>
                
                {tiers.map((tier: any, index: number) => (
                    <div key={index} className="bg-q-bg p-4 rounded-lg border border-q-border mb-4 space-y-3 relative">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-q-accent uppercase">Plan {index + 1}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const newTiers = [...tiers!];
                                    newTiers.splice(index, 1);
                                    setNestedData('pricingNeon.tiers', newTiers);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title={t('editor.controls.remove', 'Eliminar')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <ToggleControl
                            label={t('editor.controls.isPopular', 'Destacar (Popular)')}
                            checked={tier.isPopular || false}
                            onChange={(checked) => setNestedData(`pricingNeon.tiers.${index}.isPopular`, checked)}
                        />

                        <Input
                            label={t('editor.controls.tierName', 'Nombre del Plan')}
                            value={tier.name || ''}
                            onChange={(e) => setNestedData(`pricingNeon.tiers.${index}.name`, e.target.value)}
                        />
                        
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Input
                                    label={t('editor.controls.price', 'Precio')}
                                    value={tier.price || ''}
                                    onChange={(e) => setNestedData(`pricingNeon.tiers.${index}.price`, e.target.value)}
                                />
                            </div>
                            <div className="flex-1">
                                <Input
                                    label={t('editor.controls.billingPeriod', 'Período')}
                                    value={tier.billingPeriod || ''}
                                    onChange={(e) => setNestedData(`pricingNeon.tiers.${index}.billingPeriod`, e.target.value)}
                                />
                            </div>
                        </div>

                        <TextArea
                            label={t('editor.controls.description', 'Descripción')}
                            value={tier.description || ''}
                            onChange={(e) => setNestedData(`pricingNeon.tiers.${index}.description`, e.target.value)}
                            rows={2}
                        />

                        <div className="mt-3">
                            <label className="block text-xs font-bold text-q-text-secondary uppercase mb-2">
                                Características (1 por línea)
                            </label>
                            <TextArea
                                value={(tier.features || []).join('\n')}
                                onChange={(e) => {
                                    const featuresArray = e.target.value.split('\n').filter((f: string) => f.trim() !== '');
                                    setNestedData(`pricingNeon.tiers.${index}.features`, featuresArray);
                                }}
                                rows={4}
                                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                            />
                        </div>

                        {renderLinkBuilder(index, 'buttonLinkType', 'buttonLink', 'buttonText', 'Botón de Compra')}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => {
                        const newTier = { name: 'Nuevo Plan', price: '$0', billingPeriod: '/month', description: 'Descripción', features: ['Feature 1'], buttonText: 'Comprar', isPopular: false };
                        setNestedData('pricingNeon.tiers', [...tiers!, newTier]);
                    }}
                    className="w-full py-2 mt-2 bg-q-surface border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent hover:border-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <Plus size={14} /> {t('editor.controls.addTier', 'Añadir Plan')}
                </button>
            </div>
        </div>
    );

    const styleTab = (
        <div className="space-y-4">
            {/* Background Image Setup */}
            <BackgroundImageControl sectionKey="pricingNeon" data={data} setNestedData={setNestedData} />

            <div className="bg-q-surface p-4 rounded-lg border border-q-border space-y-4">
                <label className="block text-xs font-bold text-q-text-secondary uppercase mb-2 flex items-center gap-2">
                    <Maximize2 size={14} /> Layout
                </label>
                <SliderControl
                    label={t('editor.controls.sectionHeight', 'Altura de la Sección (vh)')}
                    value={sectionData.sectionHeight || 75}
                    onChange={(v) => setNestedData('pricingNeon.sectionHeight', v)}
                    min={50} max={120} step={5} suffix="vh"
                />
                <div className="mt-3">
                    <Select
                        label="Alineación de Tarjetas"
                        value={sectionData.cardsAlignment || 'center'}
                        onChange={(v) => setNestedData('pricingNeon.cardsAlignment', v)}
                        options={[
                            { value: 'start', label: 'Izquierda' },
                            { value: 'center', label: 'Centro' },
                            { value: 'end', label: 'Derecha' }
                        ]}
                    />
                </div>
                <div className="mt-3">
                  <Select
                    label={t('editor.controls.cardBorderRadius', 'Curvatura de Tarjeta')}
                    value={sectionData.cardBorderRadius || '3xl'}
                    onChange={(v) => setNestedData('pricingNeon.cardBorderRadius', v)}
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
                    onChange={(checked) => setNestedData('pricingNeon.glassEffect', checked)}
                />
                <TopDotsControl sectionKey="pricingNeon" data={data} setNestedData={setNestedData} />
                <div>
                    <label className="block text-xs text-q-text-secondary mb-1">
                        {t('editor.heroNeonControls.glowIntensity', 'Intensidad de Resplandor Neon')}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={sectionData.glowIntensity !== undefined ? sectionData.glowIntensity : 50}
                        onChange={(e) => setNestedData('pricingNeon.glowIntensity', parseInt(e.target.value))}
                        className="w-full accent-editor-accent"
                    />
                </div>
            </div>

            {/* Colors */}
            <div className="bg-q-surface p-4 rounded-lg border border-q-border space-y-3">
                <div className="flex items-center justify-between mb-4">
                    <label className="block text-xs font-bold text-q-text-secondary uppercase flex items-center gap-2">
                        <Settings size={14} /> {t('editor.controls.colors', 'Colores')}
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            setNestedData('pricingNeon.colors', undefined);
                            setNestedData('pricingNeon.glassEffect', undefined);
                        }}
                        className="text-xs text-q-text-secondary hover:text-q-accent flex items-center gap-1 transition-colors"
                        title={t('editor.controls.restoreOriginalColors', 'Restaurar colores por defecto')}
                    >
                        <RotateCcw size={12} /> Restaurar
                    </button>
                </div>
                
                <ColorControl
                    label={t('editor.controls.backgroundColor', 'Fondo General')}
                    value={sectionData.colors?.background || '#0a0a0a'}
                    onChange={(color) => setNestedData('pricingNeon.colors.background', color)}
                />
                <ColorControl
                    label={t('editor.controls.cardBackground', 'Fondo de Tarjeta')}
                    value={sectionData.colors?.cardBackground || '#141414'}
                    onChange={(color) => setNestedData('pricingNeon.colors.cardBackground', color)}
                />
                <ColorControl
                    label={t('editor.controls.cardHeadingColor', 'Color de Título de Tarjeta')}
                    value={sectionData.colors?.cardHeading || sectionData.colors?.heading || '#ffffff'}
                    onChange={(color) => setNestedData('pricingNeon.colors.cardHeading', color)}
                />
                <ColorControl
                    label={t('editor.controls.cardTextColor', 'Color de Texto de Tarjeta')}
                    value={sectionData.colors?.cardText || sectionData.colors?.text || '#a1a1aa'}
                    onChange={(color) => setNestedData('pricingNeon.colors.cardText', color)}
                />
                <ColorControl
                    label={t('editor.controls.headingColor', 'Color de Títulos')}
                    value={sectionData.colors?.heading || '#ffffff'}
                    onChange={(color) => setNestedData('pricingNeon.colors.heading', color)}
                />
                <ColorControl
                    label={t('editor.controls.textColor', 'Color de Texto')}
                    value={sectionData.colors?.text || '#a1a1aa'}
                    onChange={(color) => setNestedData('pricingNeon.colors.text', color)}
                />
                <ColorControl
                    label={t('editor.heroNeonControls.neonGlowColor', 'Color de Neón Principal')}
                    value={sectionData.colors?.neonGlow || '#FBB92B'}
                    onChange={(color) => setNestedData('pricingNeon.colors.neonGlow', color)}
                />
                <div className="space-y-2 pt-2 border-t border-q-border/50">
                    <p className="text-[10px] uppercase font-bold text-q-text-secondary/70 mb-1">{t('editor.controls.colors.primaryButton', 'Botones de Compra')}</p>
                    <ColorControl label={t('editor.controls.common.background', 'Fondo del Botón')} value={sectionData.colors?.buttonBackground} onChange={(v) => setNestedData('pricingNeon.colors.buttonBackground', v)} />
                    <ColorControl label={t('editor.controls.common.text', 'Texto del Botón')} value={sectionData.colors?.buttonText} onChange={(v) => setNestedData('pricingNeon.colors.buttonText', v)} />
                </div>
            </div>
        </div>
    );

    return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
