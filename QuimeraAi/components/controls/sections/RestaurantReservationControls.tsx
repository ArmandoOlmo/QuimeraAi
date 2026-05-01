/**
 * RestaurantReservationControls.tsx
 * Editor section controls for the Restaurant Reservation form
 */
import React from 'react';

import ColorControl from '../../ui/ColorControl';
import TabbedControls from '../../ui/TabbedControls';
import AnimationControls from '../../ui/AnimationControls';
import {
  Input, TextArea, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector
} from '../../ui/EditorControlPrimitives';
import { BackgroundImageControl, CornerGradientControl, ControlsDeps } from '../ControlsShared';
import { SliderControl } from '../../ui/EditorControlPrimitives';
import {
  FileText, Layout, Layers, CalendarCheck, Users, SlidersHorizontal
} from 'lucide-react';


export const renderRestaurantReservationControlsWithTabs = (deps: ControlsDeps) => {
  const { data, setNestedData, t } = deps;
  if (!data?.restaurantReservation) return null;

  const rd = data.restaurantReservation;

  const contentTab = (
    <div className="space-y-4">
      {/* Restaurant Link */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <CalendarCheck size={14} />
          {t('editor.restaurantReservationSection', 'Reservaciones')}
        </label>
        <Input
          label={t('restaurant.reservation.restaurantIdLabel', 'Restaurant ID')}
          value={rd.restaurantId || ''}
          onChange={(val) => setNestedData('restaurantReservation.restaurantId', val)}
        />
        <p className="text-xs text-q-text-secondary mt-1 italic">
          {t('restaurant.reservation.restaurantIdHelp', 'Vincula este formulario a un restaurante creado en el módulo de Restaurantes.')}
        </p>
      </div>

      {/* Content */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} />
          {t('controls.content', 'Contenido')}
        </label>
        <Input
          label={t('editor.controls.common.title', 'Título')}
          value={rd.title || ''}
          onChange={(val) => setNestedData('restaurantReservation.title', val)}
        />
        <FontSizeSelector
          label={t('editor.controls.common.titleSize', 'Tamaño del Título')}
          value={rd.titleFontSize || 'md'}
          onChange={(v) => setNestedData('restaurantReservation.titleFontSize', v)}
        />
        <TextArea
          label={t('editor.controls.common.description', 'Descripción')}
          value={rd.description || ''}
          onChange={(val) => setNestedData('restaurantReservation.description', val)}
          rows={2}
        />
        <FontSizeSelector
          label={t('editor.controls.common.descriptionSize', 'Tamaño de Descripción')}
          value={rd.descriptionFontSize || 'md'}
          onChange={(v) => setNestedData('restaurantReservation.descriptionFontSize', v)}
        />
        <Input
          label={t('editor.controls.common.buttonText', 'Texto del Botón')}
          value={rd.buttonText || ''}
          onChange={(val) => setNestedData('restaurantReservation.buttonText', val)}
        />
      </div>

      {/* Field Visibility */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <SlidersHorizontal size={14} />
          {t('restaurant.reservation.fieldVisibility', 'Campos del Formulario')}
        </label>
        <ToggleControl
          label={t('restaurant.reservation.showPhoneField', 'Mostrar Teléfono')}
          checked={rd.showPhone !== false}
          onChange={(v) => setNestedData('restaurantReservation.showPhone', v)}
        />
        <ToggleControl
          label={t('restaurant.reservation.showNotesField', 'Mostrar Notas Especiales')}
          checked={rd.showNotes !== false}
          onChange={(v) => setNestedData('restaurantReservation.showNotes', v)}
        />
        <ToggleControl
          label={t('restaurant.reservation.showTablePreference', 'Mostrar Preferencia de Mesa')}
          checked={rd.showTablePreference !== false}
          onChange={(v) => setNestedData('restaurantReservation.showTablePreference', v)}
        />
      </div>

      {/* Capacity */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={14} />
          {t('restaurant.reservation.capacitySettings', 'Capacidad')}
        </label>
        <SliderControl
          label={t('restaurant.reservation.minPartySize', 'Mínimo de Comensales')}
          value={rd.minPartySize || 1}
          onChange={(v) => setNestedData('restaurantReservation.minPartySize', v)}
          min={1}
          max={10}
          step={1}
        />
        <SliderControl
          label={t('restaurant.reservation.maxPartySize', 'Máximo de Comensales')}
          value={rd.maxPartySize || 20}
          onChange={(v) => setNestedData('restaurantReservation.maxPartySize', v)}
          min={2}
          max={50}
          step={1}
        />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* Glass Effect */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> {t('controls.glassmorphismTransparencia', 'Efecto Cristal')}
        </label>
        <ToggleControl
          label={t('controls.glassmorphismTransparencia', 'Activar transparencia')}
          checked={(rd as any)?.glassEffect || false}
          onChange={(v) => setNestedData('restaurantReservation.glassEffect', v)}
        />
      </div>

      <BackgroundImageControl sectionKey="restaurantReservation" data={data} setNestedData={setNestedData} />

      {/* Border Radius */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.borderRadius', 'Radio del Borde')}</label>
        <BorderRadiusSelector label={t('controls.cardRadius', 'Radio de Tarjeta')} value={rd.borderRadius || 'xl'} onChange={(v) => setNestedData('restaurantReservation.borderRadius', v)} />
        <BorderRadiusSelector label={t('controls.buttonRadius', 'Radio de Botón')} value={rd.buttonBorderRadius || 'md'} onChange={(v) => setNestedData('restaurantReservation.buttonBorderRadius', v)} />
      </div>

      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing', 'Espaciado')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical', 'Vertical')} value={rd.paddingY || 'md'} onChange={(v) => setNestedData('restaurantReservation.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal', 'Horizontal')} value={rd.paddingX || 'md'} onChange={(v) => setNestedData('restaurantReservation.paddingX', v)} />
        </div>
      </div>

      {/* Section Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.sectionColors', 'Colores de Sección')}</label>
        <ColorControl label={t('editor.controls.common.background', 'Fondo')} value={rd.colors?.background || '#0f172a'} onChange={(v) => setNestedData('restaurantReservation.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title', 'Título')} value={rd.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('restaurantReservation.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.subtitle', 'Descripción')} value={rd.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('restaurantReservation.colors.description', v)} />
        <ColorControl label={t('controls.accent', 'Acento')} value={rd.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('restaurantReservation.colors.accent', v)} />

        <CornerGradientControl
          enabled={rd.cornerGradient?.enabled || false}
          position={rd.cornerGradient?.position || 'top-left'}
          color={rd.cornerGradient?.color || '#4f46e5'}
          opacity={rd.cornerGradient?.opacity || 30}
          size={rd.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('restaurantReservation.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('restaurantReservation.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('restaurantReservation.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('restaurantReservation.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('restaurantReservation.cornerGradient.size', v)}
        />
      </div>

      {/* Card Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.cardColors', 'Colores de Tarjeta')}</label>
        <ColorControl label={t('controls.cardBackground', 'Fondo de Tarjeta')} value={rd.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('restaurantReservation.colors.cardBackground', v)} />
        <ColorControl label={t('controls.labelText', 'Texto')} value={rd.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('restaurantReservation.colors.text', v)} />
      </div>

      {/* Input Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.inputColors', 'Colores de Input')}</label>
        <ColorControl label={t('controls.inputBackground', 'Fondo de Input')} value={rd.colors?.inputBackground || '#0f172a'} onChange={(v) => setNestedData('restaurantReservation.colors.inputBackground', v)} />
        <ColorControl label={t('controls.inputText', 'Texto de Input')} value={rd.colors?.inputText || '#F9FAFB'} onChange={(v) => setNestedData('restaurantReservation.colors.inputText', v)} />
        <ColorControl label={t('controls.inputBorder', 'Borde de Input')} value={rd.colors?.inputBorder || '#334155'} onChange={(v) => setNestedData('restaurantReservation.colors.inputBorder', v)} />
      </div>

      {/* Button Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.buttonGradient', 'Botón')}</label>
        <ColorControl label={t('controls.fondoBotn', 'Fondo del Botón')} value={rd.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('restaurantReservation.colors.buttonBackground', v)} />
        <ColorControl label={t('editor.controls.common.buttonText', 'Texto del Botón')} value={rd.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('restaurantReservation.colors.buttonText', v)} />
      </div>

      {/* Animation Controls */}
      <AnimationControls
        animationType={rd.animationType || 'fade-in-up'}
        enableCardAnimation={true}
        onChangeAnimationType={(type) => setNestedData('restaurantReservation.animationType', type)}
        onToggleAnimation={() => {}}
        label={t('editor.controls.common.cardAnimations', 'Animaciones')}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
