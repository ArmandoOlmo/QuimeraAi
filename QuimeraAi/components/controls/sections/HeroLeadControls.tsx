/**
 * HeroLeadControls.tsx
 * Section controls for the Hero Lead (split hero + lead form) component
 */
import React from 'react';

import ColorControl from '../../ui/ColorControl';
import ImagePicker from '../../ui/ImagePicker';
import AIFormControl from '../../ui/AIFormControl';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector } from '../../ui/EditorControlPrimitives';
import { BackgroundImageControl, CornerGradientControl, ControlsDeps } from '../ControlsShared';
import {
  Type, Layout, Palette, Layers, FormInput, Eye,
} from 'lucide-react';


export const renderHeroLeadControls = (deps: ControlsDeps) => {
  const { data, setNestedData, setAiAssistField, t } = deps;
  if (!data?.heroLead) return null;

  const hl = data.heroLead;

  // ── Content Tab ───────────────────────────────────────────────────────────
  const contentTab = (
    <div className="space-y-4">
      {/* Hero Content */}
      <div>
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('controls.content')}
        </label>

        <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: 'heroLead.headline', value: hl.headline, context: 'Hero Lead Headline' })}>
          <TextArea value={hl.headline} onChange={(e) => setNestedData('heroLead.headline', e.target.value)} rows={2} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.headlineSize')} value={hl.headlineFontSize || 'lg'} onChange={(v) => setNestedData('heroLead.headlineFontSize', v)} />

        <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: 'heroLead.subheadline', value: hl.subheadline, context: 'Hero Lead Subheadline' })}>
          <TextArea value={hl.subheadline} onChange={(e) => setNestedData('heroLead.subheadline', e.target.value)} rows={3} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.subheadlineSize')} value={hl.subheadlineFontSize || 'md'} onChange={(v) => setNestedData('heroLead.subheadlineFontSize', v)} />

        <Input label="Badge" value={hl.badgeText || ''} onChange={(e) => setNestedData('heroLead.badgeText', e.target.value)} />
      </div>

      {/* Form Content */}
      <div>
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FormInput size={14} />
          {t('controls.form', 'Formulario')}
        </label>

        <Input label={t('controls.formTitle', 'Título del formulario')} value={hl.formTitle || ''} onChange={(e) => setNestedData('heroLead.formTitle', e.target.value)} />
        <FontSizeSelector label={t('controls.formTitleSize', 'Tamaño del título')} value={hl.formTitleFontSize || 'sm'} onChange={(v) => setNestedData('heroLead.formTitleFontSize', v)} />
        
        <TextArea label={t('controls.formDescription', 'Descripción del formulario')} value={hl.formDescription || ''} onChange={(e) => setNestedData('heroLead.formDescription', e.target.value)} rows={2} />
        <FontSizeSelector label={t('controls.formDescriptionSize', 'Tamaño de la descripción')} value={hl.formDescriptionFontSize || 'sm'} onChange={(v) => setNestedData('heroLead.formDescriptionFontSize', v)} />

        <Input label={t('controls.namePlaceholder', 'Placeholder: Nombre')} value={hl.namePlaceholder || ''} onChange={(e) => setNestedData('heroLead.namePlaceholder', e.target.value)} />
        <Input label={t('controls.emailPlaceholder', 'Placeholder: Email')} value={hl.emailPlaceholder || ''} onChange={(e) => setNestedData('heroLead.emailPlaceholder', e.target.value)} />
        <Input label={t('controls.companyPlaceholder', 'Placeholder: Empresa')} value={hl.companyPlaceholder || ''} onChange={(e) => setNestedData('heroLead.companyPlaceholder', e.target.value)} />
        <Input label={t('controls.phonePlaceholder', 'Placeholder: Teléfono')} value={hl.phonePlaceholder || ''} onChange={(e) => setNestedData('heroLead.phonePlaceholder', e.target.value)} />
        <Input label={t('controls.messagePlaceholder', 'Placeholder: Mensaje')} value={hl.messagePlaceholder || ''} onChange={(e) => setNestedData('heroLead.messagePlaceholder', e.target.value)} />
        <Input label={t('editor.controls.common.buttonText')} value={hl.buttonText} onChange={(e) => setNestedData('heroLead.buttonText', e.target.value)} />
        <Input label={t('controls.successMessage', 'Mensaje de éxito')} value={hl.successMessage || ''} onChange={(e) => setNestedData('heroLead.successMessage', e.target.value)} />
      </div>

      {/* Field Visibility */}
      <div>
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Eye size={14} />
          {t('controls.fieldVisibility', 'Campos visibles')}
        </label>
        <ToggleControl label={t('controls.showCompanyField', 'Mostrar campo de empresa')} checked={hl.showCompanyField || false} onChange={(v) => setNestedData('heroLead.showCompanyField', v)} />
        <ToggleControl label={t('controls.showPhoneField', 'Mostrar campo de teléfono')} checked={hl.showPhoneField || false} onChange={(v) => setNestedData('heroLead.showPhoneField', v)} />
        <ToggleControl label={t('controls.showMessageField', 'Mostrar campo de mensaje')} checked={hl.showMessageField !== false} onChange={(v) => setNestedData('heroLead.showMessageField', v)} />
      </div>

      {/* Image */}
      <div>
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          Imagen de fondo (lado informativo)
        </label>
        <ImagePicker label={t('editor.controls.hero.image')} value={hl.imageUrl || ''} onChange={(url) => setNestedData('heroLead.imageUrl', url)} />
        {hl.imageUrl && (
          <div className="mt-3 pt-3 border-t border-editor-border/30">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider block mb-2">
              {t('editor.controls.common.bgPosition', 'Posición de Enfoque')}
            </label>
            <div className="grid grid-cols-3 gap-1 bg-editor-bg p-1.5 rounded-md border border-editor-border w-fit mx-auto">
              {[
                { id: 'top left', label: '↖' },
                { id: 'top center', label: '↑' },
                { id: 'top right', label: '↗' },
                { id: 'center left', label: '←' },
                { id: 'center center', label: '●' },
                { id: 'center right', label: '→' },
                { id: 'bottom left', label: '↙' },
                { id: 'bottom center', label: '↓' },
                { id: 'bottom right', label: '↘' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setNestedData('heroLead.imagePosition', pos.id)}
                  className={`w-8 h-8 flex items-center justify-center rounded-sm transition-all text-sm ${(hl.imagePosition || 'center center') === pos.id
                    ? 'bg-editor-accent text-editor-bg shadow-md scale-110'
                    : 'text-editor-text-secondary hover:bg-editor-border hover:text-editor-text-primary'
                  }`}
                  title={pos.id}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Style Tab ─────────────────────────────────────────────────────────────
  const styleTab = (
    <div className="space-y-4">
      {/* Glassmorphism */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t('controls.glassmorphismTransparencia')}
          checked={hl.glassEffect || false}
          onChange={(v) => setNestedData('heroLead.glassEffect', v)}
        />
      </div>

      {/* Background Image (SectionBackground) */}
      <BackgroundImageControl sectionKey="heroLead" data={data} setNestedData={setNestedData} />

      {/* Layout */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Layout
        </label>

        {/* Form Position Toggle */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-editor-text-secondary mb-2">
            {t('controls.formPosition', 'Posición del formulario')}
          </label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
            {(['left', 'right'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => setNestedData('heroLead.formPosition', pos)}
                className={`flex-1 py-2 text-sm font-medium rounded-sm capitalize ${hl.formPosition === pos
                  ? 'bg-editor-accent text-editor-bg'
                  : 'text-editor-text-secondary hover:bg-editor-border'
                }`}
              >
                {pos === 'left' ? '← Form Left' : 'Form Right →'}
              </button>
            ))}
          </div>
        </div>

        {/* Hero Height */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">{t('controls.heroHeight', 'Altura')}</label>
            <span className="text-xs text-editor-text-primary">{hl.heroHeight || 85}vh</span>
          </div>
          <input
            type="range" min="50" max="100" step="5"
            value={hl.heroHeight || 85}
            onChange={(e) => setNestedData('heroLead.heroHeight', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        {/* Overlay Opacity */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">{t('controls.overlayOpacity', 'Opacidad overlay')}</label>
            <span className="text-xs text-editor-text-primary">{hl.overlayOpacity ?? 50}%</span>
          </div>
          <input
            type="range" min="0" max="100" step="5"
            value={hl.overlayOpacity ?? 50}
            onChange={(e) => setNestedData('heroLead.overlayOpacity', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        {/* Form Card Opacity */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">{t('controls.formCardOpacity', 'Opacidad card formulario')}</label>
            <span className="text-xs text-editor-text-primary">{hl.formCardOpacity ?? 100}%</span>
          </div>
          <input
            type="range" min="0" max="100" step="5"
            value={hl.formCardOpacity ?? 100}
            onChange={(e) => setNestedData('heroLead.formCardOpacity', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        {/* Spacing */}
        <PaddingSelector label={t('controls.verticalPadding')} value={hl.paddingY || 'md'} onChange={(v) => setNestedData('heroLead.paddingY', v)} />
        <PaddingSelector label={t('controls.horizontalPadding')} value={hl.paddingX || 'md'} onChange={(v) => setNestedData('heroLead.paddingX', v)} />

        {/* Border Radius */}
        <BorderRadiusSelector label={t('controls.cardCorners', 'Esquinas del card')} value={hl.cardBorderRadius || 'xl'} onChange={(v) => setNestedData('heroLead.cardBorderRadius', v)} />
        <BorderRadiusSelector label={t('controls.inputCorners', 'Esquinas de inputs')} value={hl.inputBorderRadius || 'md'} onChange={(v) => setNestedData('heroLead.inputBorderRadius', v)} />
        <BorderRadiusSelector label={t('controls.buttonCorners')} value={hl.buttonBorderRadius || 'md'} onChange={(v) => setNestedData('heroLead.buttonBorderRadius', v)} />
      </div>

      {/* Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>

        <div className="space-y-3">
          <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold">Sección</p>
          <ColorControl label={t('controls.backgroundColor')} value={hl.colors?.background || '#0f172a'} onChange={(v) => setNestedData('heroLead.colors.background', v)} />
          <ColorControl label={t('controls.infoBackground', 'Fondo lado info')} value={hl.colors?.infoBackground || 'transparent'} onChange={(v) => setNestedData('heroLead.colors.infoBackground', v)} />

          <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold mt-2">Texto</p>
          <ColorControl label={t('controls.headlineColor')} value={hl.colors?.heading || '#f8fafc'} onChange={(v) => setNestedData('heroLead.colors.heading', v)} />
          <ColorControl label={t('controls.textColor')} value={hl.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('heroLead.colors.text', v)} />
          <ColorControl label="Accent" value={hl.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('heroLead.colors.accent', v)} />

          <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold mt-2">Badge</p>
          <ColorControl label={t('controls.badgeBackground', 'Fondo badge')} value={hl.colors?.badgeBackground || '#4f46e5'} onChange={(v) => setNestedData('heroLead.colors.badgeBackground', v)} />
          <ColorControl label={t('controls.badgeText', 'Texto badge')} value={hl.colors?.badgeText || '#ffffff'} onChange={(v) => setNestedData('heroLead.colors.badgeText', v)} />

          <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold mt-2">Formulario</p>
          <ColorControl label={t('controls.formBackground', 'Fondo formulario')} value={hl.colors?.formBackground || '#1e293b'} onChange={(v) => setNestedData('heroLead.colors.formBackground', v)} />
          <ColorControl label={t('controls.formHeading', 'Título formulario')} value={hl.colors?.formHeading || '#f8fafc'} onChange={(v) => setNestedData('heroLead.colors.formHeading', v)} />
          <ColorControl label={t('controls.formText', 'Texto formulario')} value={hl.colors?.formText || '#94a3b8'} onChange={(v) => setNestedData('heroLead.colors.formText', v)} />
          <ColorControl label="Border" value={hl.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('heroLead.colors.borderColor', v)} />

          <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold mt-2">Inputs</p>
          <ColorControl label={t('controls.inputBackground')} value={hl.colors?.inputBackground || '#0f172a'} onChange={(v) => setNestedData('heroLead.colors.inputBackground', v)} />
          <ColorControl label={t('controls.inputText')} value={hl.colors?.inputText || '#f8fafc'} onChange={(v) => setNestedData('heroLead.colors.inputText', v)} />
          <ColorControl label={t('controls.inputBorder')} value={hl.colors?.inputBorder || '#334155'} onChange={(v) => setNestedData('heroLead.colors.inputBorder', v)} />
          <ColorControl label={t('controls.inputPlaceholder', 'Placeholder')} value={hl.colors?.inputPlaceholder || '#6b7280'} onChange={(v) => setNestedData('heroLead.colors.inputPlaceholder', v)} />

          <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold mt-2">Button</p>
          <ColorControl label={t('controls.fondoBotn')} value={hl.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('heroLead.colors.buttonBackground', v)} />
          <ColorControl label={t('editor.controls.common.buttonText')} value={hl.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('heroLead.colors.buttonText', v)} />

          {/* Corner Gradient */}
          <CornerGradientControl
            enabled={hl.cornerGradient?.enabled || false}
            position={hl.cornerGradient?.position || 'top-left'}
            color={hl.cornerGradient?.color || '#4f46e5'}
            opacity={hl.cornerGradient?.opacity || 30}
            size={hl.cornerGradient?.size || 50}
            onEnabledChange={(v) => setNestedData('heroLead.cornerGradient.enabled', v)}
            onPositionChange={(v) => setNestedData('heroLead.cornerGradient.position', v)}
            onColorChange={(v) => setNestedData('heroLead.cornerGradient.color', v)}
            onOpacityChange={(v) => setNestedData('heroLead.cornerGradient.opacity', v)}
            onSizeChange={(v) => setNestedData('heroLead.cornerGradient.size', v)}
          />
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
