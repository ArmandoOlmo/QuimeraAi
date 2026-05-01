/**
 * HeroLeadControls.tsx
 * Section controls for the Hero Lead (split hero + lead form) component
 */
import React from 'react';

import ColorControl from '../../ui/ColorControl';
import ImagePicker from '../../ui/ImagePicker';
import AIFormControl from '../../ui/AIFormControl';
import TabbedControls from '../../ui/TabbedControls';
import { Input, TextArea, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector, PositionGridControl, SliderControl , I18nInput, I18nTextArea } from '../../ui/EditorControlPrimitives';
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
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('controls.content')}
        </label>

        <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: 'heroLead.headline', value: hl.headline, context: 'Hero Lead Headline' })}>
          <I18nTextArea value={hl.headline} onChange={(val) => setNestedData('heroLead.headline', val)} rows={2} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.headlineSize')} value={hl.headlineFontSize || 'lg'} onChange={(v) => setNestedData('heroLead.headlineFontSize', v)} />

        <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: 'heroLead.subheadline', value: hl.subheadline, context: 'Hero Lead Subheadline' })}>
          <I18nTextArea value={hl.subheadline} onChange={(val) => setNestedData('heroLead.subheadline', val)} rows={3} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.subheadlineSize')} value={hl.subheadlineFontSize || 'md'} onChange={(v) => setNestedData('heroLead.subheadlineFontSize', v)} />

        <I18nInput label="Badge" value={hl.badgeText || ''} onChange={(val) => setNestedData('heroLead.badgeText', val)} />
      </div>

      {/* Form Content */}
      <div>
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FormInput size={14} />
          {t('controls.form', 'Formulario')}
        </label>

        <I18nInput label={t('controls.formTitle', 'Título del formulario')} value={hl.formTitle || ''} onChange={(val) => setNestedData('heroLead.formTitle', val)} />
        <FontSizeSelector label={t('controls.formTitleSize', 'Tamaño del título')} value={hl.formTitleFontSize || 'sm'} onChange={(v) => setNestedData('heroLead.formTitleFontSize', v)} />
        
        <I18nTextArea label={t('controls.formDescription', 'Descripción del formulario')} value={hl.formDescription || ''} onChange={(val) => setNestedData('heroLead.formDescription', val)} rows={2} />
        <FontSizeSelector label={t('controls.formDescriptionSize', 'Tamaño de la descripción')} value={hl.formDescriptionFontSize || 'sm'} onChange={(v) => setNestedData('heroLead.formDescriptionFontSize', v)} />

        <I18nInput label={t('controls.namePlaceholder', 'Placeholder: Nombre')} value={hl.namePlaceholder || ''} onChange={(val) => setNestedData('heroLead.namePlaceholder', val)} />
        <I18nInput label={t('controls.emailPlaceholder', 'Placeholder: Email')} value={hl.emailPlaceholder || ''} onChange={(val) => setNestedData('heroLead.emailPlaceholder', val)} />
        <I18nInput label={t('controls.companyPlaceholder', 'Placeholder: Empresa')} value={hl.companyPlaceholder || ''} onChange={(val) => setNestedData('heroLead.companyPlaceholder', val)} />
        <I18nInput label={t('controls.phonePlaceholder', 'Placeholder: Teléfono')} value={hl.phonePlaceholder || ''} onChange={(val) => setNestedData('heroLead.phonePlaceholder', val)} />
        <I18nInput label={t('controls.messagePlaceholder', 'Placeholder: Mensaje')} value={hl.messagePlaceholder || ''} onChange={(val) => setNestedData('heroLead.messagePlaceholder', val)} />
        <I18nInput label={t('editor.controls.common.buttonText')} value={hl.buttonText} onChange={(val) => setNestedData('heroLead.buttonText', val)} />
        <I18nInput label={t('controls.successMessage', 'Mensaje de éxito')} value={hl.successMessage || ''} onChange={(val) => setNestedData('heroLead.successMessage', val)} />
      </div>

      {/* Field Visibility */}
      <div>
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Eye size={14} />
          {t('controls.fieldVisibility', 'Campos visibles')}
        </label>
        <ToggleControl label={t('controls.showCompanyField', 'Mostrar campo de empresa')} checked={hl.showCompanyField || false} onChange={(v) => setNestedData('heroLead.showCompanyField', v)} />
        <ToggleControl label={t('controls.showPhoneField', 'Mostrar campo de teléfono')} checked={hl.showPhoneField || false} onChange={(v) => setNestedData('heroLead.showPhoneField', v)} />
        <ToggleControl label={t('controls.showMessageField', 'Mostrar campo de mensaje')} checked={hl.showMessageField !== false} onChange={(v) => setNestedData('heroLead.showMessageField', v)} />
      </div>

      {/* Image */}
      <div>
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          Imagen de fondo (lado informativo)
        </label>
        <ImagePicker label={t('editor.controls.hero.image')} value={hl.imageUrl || ''} onChange={(url) => setNestedData('heroLead.imageUrl', url)} />
        {hl.imageUrl && (
          <PositionGridControl
            label={t('editor.controls.common.bgPosition', 'Posición de Enfoque')}
            value={hl.imagePosition || 'center center'}
            onChange={(val) => setNestedData('heroLead.imagePosition', val)}
          />
        )}
      </div>
    </div>
  );

  // ── Style Tab ─────────────────────────────────────────────────────────────
  const styleTab = (
    <div className="space-y-4">
      {/* Glassmorphism */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
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
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Layout
        </label>

        {/* Form Position Toggle */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-q-text-secondary mb-2">
            {t('controls.formPosition', 'Posición del formulario')}
          </label>
          <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
            {(['left', 'right'] as const).map(pos => (
              <button
                type="button"
                key={pos}
                onClick={(e) => {
                  e.preventDefault();
                  setNestedData('heroLead.formPosition', pos);
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-sm capitalize ${hl.formPosition === pos
                  ? 'bg-q-accent text-q-bg'
                  : 'text-q-text-secondary hover:bg-q-surface-overlay'
                }`}
              >
                {pos === 'left' ? '← Form Left' : 'Form Right →'}
              </button>
            ))}
          </div>
        </div>

        {/* Hero Height */}
        <div className="mb-4">
          <SliderControl
            label={t('controls.heroHeight', 'Altura')}
            value={hl.heroHeight || 85}
            onChange={(v) => setNestedData('heroLead.heroHeight', v)}
            min={50} max={100} step={5} suffix="vh"
          />
        </div>

        {/* Overlay Opacity */}
        <div className="mb-4">
          <SliderControl
            label={t('controls.overlayOpacity', 'Opacidad overlay')}
            value={hl.overlayOpacity ?? 50}
            onChange={(v) => setNestedData('heroLead.overlayOpacity', v)}
            min={0} max={100} step={5} suffix="%"
          />
        </div>

        {/* Form Card Opacity */}
        <div className="mb-4">
          <SliderControl
            label={t('controls.formCardOpacity', 'Opacidad card formulario')}
            value={hl.formCardOpacity ?? 100}
            onChange={(v) => setNestedData('heroLead.formCardOpacity', v)}
            min={0} max={100} step={5} suffix="%"
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
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>

        <div className="space-y-3">
          <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold">Sección</p>
          <ColorControl label={t('controls.backgroundColor')} value={hl.colors?.background || '#0f172a'} onChange={(v) => setNestedData('heroLead.colors.background', v)} />
          <ColorControl label={t('controls.infoBackground', 'Fondo lado info')} value={hl.colors?.infoBackground || 'transparent'} onChange={(v) => setNestedData('heroLead.colors.infoBackground', v)} />

          <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold mt-2">Texto</p>
          <ColorControl label={t('controls.headlineColor')} value={hl.colors?.heading || '#f8fafc'} onChange={(v) => setNestedData('heroLead.colors.heading', v)} />
          <ColorControl label={t('controls.textColor')} value={hl.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('heroLead.colors.text', v)} />
          <ColorControl label="Accent" value={hl.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('heroLead.colors.accent', v)} />

          <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold mt-2">Badge</p>
          <ColorControl label={t('controls.badgeBackground', 'Fondo badge')} value={hl.colors?.badgeBackground || '#4f46e5'} onChange={(v) => setNestedData('heroLead.colors.badgeBackground', v)} />
          <ColorControl label={t('controls.badgeText', 'Texto badge')} value={hl.colors?.badgeText || '#ffffff'} onChange={(v) => setNestedData('heroLead.colors.badgeText', v)} />

          <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold mt-2">Formulario</p>
          <ColorControl label={t('controls.formBackground', 'Fondo formulario')} value={hl.colors?.formBackground || '#1e293b'} onChange={(v) => setNestedData('heroLead.colors.formBackground', v)} />
          <ColorControl label={t('controls.formHeading', 'Título formulario')} value={hl.colors?.formHeading || '#f8fafc'} onChange={(v) => setNestedData('heroLead.colors.formHeading', v)} />
          <ColorControl label={t('controls.formText', 'Texto formulario')} value={hl.colors?.formText || '#94a3b8'} onChange={(v) => setNestedData('heroLead.colors.formText', v)} />
          <ColorControl label="Border" value={hl.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('heroLead.colors.borderColor', v)} />

          <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold mt-2">Inputs</p>
          <ColorControl label={t('controls.inputBackground')} value={hl.colors?.inputBackground || '#0f172a'} onChange={(v) => setNestedData('heroLead.colors.inputBackground', v)} />
          <ColorControl label={t('controls.inputText')} value={hl.colors?.inputText || '#f8fafc'} onChange={(v) => setNestedData('heroLead.colors.inputText', v)} />
          <ColorControl label={t('controls.inputBorder')} value={hl.colors?.inputBorder || '#334155'} onChange={(v) => setNestedData('heroLead.colors.inputBorder', v)} />
          <ColorControl label={t('controls.inputPlaceholder', 'Placeholder')} value={hl.colors?.inputPlaceholder || '#6b7280'} onChange={(v) => setNestedData('heroLead.colors.inputPlaceholder', v)} />

          <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold mt-2">Button</p>
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
