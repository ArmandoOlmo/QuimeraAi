/**
 * HeroGalleryControls.tsx
 * Section controls extracted from Controls.tsx
 */
import React, { useState, useRef } from 'react';

import ColorControl from '../../ui/ColorControl';
import ImagePicker from '../../ui/ImagePicker';
import IconSelector from '../../ui/IconSelector';
import AIFormControl from '../../ui/AIFormControl';
import TabbedControls from '../../ui/TabbedControls';
import AnimationControls from '../../ui/AnimationControls';
import SocialLinksEditor from '../../ui/SocialLinksEditor';
import { Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector, PositionGridControl, SliderControl , I18nInput, I18nTextArea } from '../../ui/EditorControlPrimitives';
import { BackgroundImageControl, CornerGradientControl, extractVideoId, ControlsDeps } from '../ControlsShared';
import {
  Trash2, Plus, ChevronDown, ChevronRight, ChevronLeft, ChevronUp, HelpCircle,
  Layout, Image, List, Star, PlaySquare, Users, DollarSign, Eye,
  Briefcase, MessageCircle, Mail, Send, Type, MousePointerClick,
  Settings, AlignJustify, MonitorPlay, Grid, GripVertical, Upload, MessageSquare, FileText, PlusCircle, X, Palette, AlertCircle, TrendingUp, Sparkles, MapPin, Map as MapIcon, Columns, Search, Loader2, ShoppingBag, Info, Store, SlidersHorizontal, LayoutGrid, Check, Link, FolderOpen, Maximize2, Clock, Zap,
  Twitter, Facebook, Instagram, Linkedin, Github, Youtube, Music, Pin, Ghost, Gamepad2, AtSign, Share2, Waves, Bell,
  Megaphone, Tag, Gift, Truck, Percent, Heart, ShieldCheck, Flame, Award, Crown, Phone,
  Layers, UserPlus
} from 'lucide-react';
import { SingleProductSelector, SingleCollectionSelector, SingleContentSelector } from '../../ui/EcommerceControls';


export const renderHeroGalleryControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.heroGallery) return null;

  const slides = data.heroGallery.slides || [];

  const contentTab = (
    <div className="space-y-4">
      {/* Slides */}
      <div>
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <PlaySquare size={14} />
          Slides ({slides.length})
        </label>

        {slides.map((slide: any, slideIndex: number) => (
          <div key={slideIndex} className="bg-q-bg p-4 rounded-lg border border-q-border mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-q-accent uppercase">Slide #{slideIndex + 1}</span>
              {slides.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const newSlides = slides.filter((_: any, i: number) => i !== slideIndex);
                    setNestedData('heroGallery.slides', newSlides);
                  }}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  title="Remove slide"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Headline */}
            <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: `heroGallery.slides.${slideIndex}.headline`, value: slide.headline, context: 'Hero Gallery Headline' })}>
              <I18nTextArea value={slide.headline || ''} onChange={(val) => setNestedData(`heroGallery.slides.${slideIndex}.headline`, val)} rows={2} />
            </AIFormControl>

            {/* Subheadline */}
            <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: `heroGallery.slides.${slideIndex}.subheadline`, value: slide.subheadline || '', context: 'Hero Gallery Subheadline' })}>
              <I18nInput label="" value={slide.subheadline || ''} onChange={(val) => setNestedData(`heroGallery.slides.${slideIndex}.subheadline`, val)} />
            </AIFormControl>

            {/* CTAs */}
            <div className="bg-q-surface/50 p-3 rounded-md border border-q-border mt-3">
              <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <Link size={12} />
                Call to Actions
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <I18nInput label={t('controls.primaryCta')} value={slide.primaryCta || ''} onChange={(val) => setNestedData(`heroGallery.slides.${slideIndex}.primaryCta`, val)} />
                <I18nInput label={t('controls.primaryLink')} value={slide.primaryCtaLink || ''} onChange={(val) => setNestedData(`heroGallery.slides.${slideIndex}.primaryCtaLink`, val)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <I18nInput label={t('controls.secondaryCta')} value={slide.secondaryCta || ''} onChange={(val) => setNestedData(`heroGallery.slides.${slideIndex}.secondaryCta`, val)} />
                <I18nInput label={t('controls.secondaryLink')} value={slide.secondaryCtaLink || ''} onChange={(val) => setNestedData(`heroGallery.slides.${slideIndex}.secondaryCtaLink`, val)} />
              </div>
            </div>

            {/* Background Image */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <Image size={12} />
                Background Image
              </label>
              <ImagePicker
                label={t('controls.slideBackground')}
                value={slide.backgroundImage || ''}
                onChange={(url) => setNestedData(`heroGallery.slides.${slideIndex}.backgroundImage`, url)}
                onRemove={() => setNestedData(`heroGallery.slides.${slideIndex}.backgroundImage`, '')}
              />
            </div>

            {/* Per-Slide Fallback Background Color */}
            <div className="mt-3">
              <ColorControl label={t('controls.fallbackColor')} value={slide.backgroundColor || data.heroGallery.colors?.background || '#8B6F5C'} onChange={(v) => setNestedData(`heroGallery.slides.${slideIndex}.backgroundColor`, v)} />
            </div>
          </div>
        ))}

        {/* Add Slide Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const newSlide = {
              headline: 'New Slide Headline',
              subheadline: 'Subtitle here',
              primaryCta: 'SHOP NOW',
              primaryCtaLink: '/#products',
              secondaryCta: '',
              secondaryCtaLink: '',
              backgroundImage: '',
              backgroundColor: data.heroGallery.colors?.background || '#8B6F5C',
            };
            setNestedData('heroGallery.slides', [...slides, newSlide]);
          }}
          className="w-full py-2 bg-q-accent text-q-bg rounded-md hover:bg-q-accent/90 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Plus size={16} /> Add Slide
        </button>
      </div>

      {/* ========== TEXT LAYOUT ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Ubicación del Texto
        </label>

        {/* Visual 3x3 position grid */}
        <div className="relative bg-q-bg rounded-lg border border-q-border p-3 mb-4">
          {/* Preview area with position indicator */}
          <div className="relative aspect-video bg-gradient-to-br from-editor-panel-bg to-editor-bg rounded-md border border-q-border/50 overflow-hidden mb-2">
            {/* Decorative lines representing text */}
            {(() => {
              const hAlign = data?.heroGallery?.textHorizontalAlign || 'left';
              const vAlign = data?.heroGallery?.textVerticalAlign || 'bottom';
              const isLeft = hAlign === 'left';
              const isRight = hAlign === 'right';
              const isTop = vAlign === 'top';
              const isBottom = vAlign === 'bottom';
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
          {/* 3x3 clickable grid */}
          <div className="grid grid-cols-3 gap-1">
            {([
              { h: 'left', v: 'top',      row: 0, col: 0, label: 'Arriba Izquierda' },
              { h: 'center', v: 'top',    row: 0, col: 1, label: 'Arriba Centro' },
              { h: 'right', v: 'top',     row: 0, col: 2, label: 'Arriba Derecha' },
              { h: 'left', v: 'middle',   row: 1, col: 0, label: 'Medio Izquierda' },
              { h: 'center', v: 'middle', row: 1, col: 1, label: 'Centro' },
              { h: 'right', v: 'middle',  row: 1, col: 2, label: 'Medio Derecha' },
              { h: 'left', v: 'bottom',   row: 2, col: 0, label: 'Abajo Izquierda' },
              { h: 'center', v: 'bottom', row: 2, col: 1, label: 'Abajo Centro' },
              { h: 'right', v: 'bottom',  row: 2, col: 2, label: 'Abajo Derecha' },
            ] as const).map(pos => {
              const currentH = data?.heroGallery?.textHorizontalAlign || 'left';
              const currentV = data?.heroGallery?.textVerticalAlign || 'bottom';
              const isSelected = currentH === pos.h && currentV === pos.v;
              return (
                <button
                  type="button"
                  key={`${pos.h}-${pos.v}`}
                  title={pos.label}
                  onClick={(e) => {
                    e.preventDefault();
                    setNestedData('heroGallery.textHorizontalAlign', pos.h);
                    setNestedData('heroGallery.textVerticalAlign', pos.v);
                  }}
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
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      {/* Overlay & Grain */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Image Overlay
        </label>

        {/* Overlay Opacity */}
        <div className="mb-4">
          <SliderControl
            label={t('controls.overlayDarkness')}
            value={Math.round((data.heroGallery.overlayOpacity ?? 0.35) * 100)}
            onChange={(v) => setNestedData('heroGallery.overlayOpacity', v / 100)}
            min={0}
            max={80}
            step={5}
            suffix="%"
          />
        </div>

        <ToggleControl label={t('controls.grainTexture')} checked={data.heroGallery.showGrain ?? true} onChange={(v) => setNestedData('heroGallery.showGrain', v)} />

        {/* Image Focus Position */}
        <PositionGridControl
          label={t('editor.controls.common.bgPosition', 'Posición de Enfoque')}
          value={data?.heroGallery?.bgPosition || 'center center'}
          onChange={(val) => setNestedData('heroGallery.bgPosition', val)}
        />
      </div>

      {/* Hero Height */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Layout
        </label>

        {/* Hero Height */}
        <div className="mb-4">
          <SliderControl
            label={t('controls.heroHeight')}
            value={data.heroGallery.heroHeight || 80}
            onChange={(v) => setNestedData('heroGallery.heroHeight', v)}
            min={50}
            max={100}
            step={5}
            suffix="vh"
          />
        </div>

        <FontSizeSelector label={t('controls.headlineSize')} value={data.heroGallery.headlineFontSize || 'lg'} onChange={(v) => setNestedData('heroGallery.headlineFontSize', v)} />
        <FontSizeSelector label={t('controls.subheadlineSize')} value={data.heroGallery.subheadlineFontSize || 'md'} onChange={(v) => setNestedData('heroGallery.subheadlineFontSize', v)} />
      </div>

      {/* Slideshow Settings */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <PlaySquare size={14} />
          Slideshow
        </label>

        <div className="mb-3">
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.autoplaySpeedMs')}</label>
          <input
            type="number" min="2000" max="15000" step="500"
            value={data.heroGallery.autoPlaySpeed || 6000}
            onChange={(e) => setNestedData('heroGallery.autoPlaySpeed', parseInt(e.target.value))}
            className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text-primary focus:outline-none focus:ring-1 focus:ring-q-accent"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.transitionDurationMs')}</label>
          <input
            type="number" min="300" max="2000" step="100"
            value={data.heroGallery.transitionDuration || 800}
            onChange={(e) => setNestedData('heroGallery.transitionDuration', parseInt(e.target.value))}
            className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text-primary focus:outline-none focus:ring-1 focus:ring-q-accent"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.navigation')}</label>
        <ToggleControl label={t('controls.showArrows')} checked={data.heroGallery.showArrows ?? true} onChange={(v) => setNestedData('heroGallery.showArrows', v)} />
        <ToggleControl label={t('controls.showDots')} checked={data.heroGallery.showDots ?? true} onChange={(v) => setNestedData('heroGallery.showDots', v)} />

        {(data.heroGallery.showDots ?? true) && (
          <Select
            label={t('controls.dotStyle')}
            value={data.heroGallery.dotStyle || 'circle'}
            onChange={(val) => setNestedData('heroGallery.dotStyle', val)}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'line', label: 'Line' },
            ]}
            noMargin
          />
        )}
      </div>

      {/* Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>

        <div className="space-y-3">
          <ColorControl label={t('controls.fallbackBackground')} value={data.heroGallery.colors?.background || '#8B6F5C'} onChange={(v) => setNestedData('heroGallery.colors.background', v)} />
          <ColorControl label={t('controls.headline')} value={data.heroGallery.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.heading', v)} />
          <ColorControl label={t('controls.text')} value={data.heroGallery.colors?.text || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.text', v)} />
          <ColorControl label={t('controls.ctaText')} value={data.heroGallery.colors?.ctaText || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.ctaText', v)} />

          {(data.heroGallery.showArrows ?? true) && (
            <>
              <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold mt-2">Arrows</p>
              <ColorControl label={t('controls.arrowColor')} value={data.heroGallery.colors?.arrowColor || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.arrowColor', v)} />
            </>
          )}

          {(data.heroGallery.showDots ?? true) && (
            <>
              <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold mt-2">Dots</p>
              <ColorControl label={t('controls.activeDot')} value={data.heroGallery.colors?.dotActive || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.dotActive', v)} />
              <ColorControl label={t('controls.inactiveDot')} value={data.heroGallery.colors?.dotInactive || 'rgba(255,255,255,0.5)'} onChange={(v) => setNestedData('heroGallery.colors.dotInactive', v)} />
            </>
          )}

          {/* Corner Gradient */}
          <CornerGradientControl
            enabled={data.heroGallery.cornerGradient?.enabled || false}
            position={data.heroGallery.cornerGradient?.position || 'top-left'}
            color={data.heroGallery.cornerGradient?.color || '#4f46e5'}
            opacity={data.heroGallery.cornerGradient?.opacity || 30}
            size={data.heroGallery.cornerGradient?.size || 50}
            onEnabledChange={(v) => setNestedData('heroGallery.cornerGradient.enabled', v)}
            onPositionChange={(v) => setNestedData('heroGallery.cornerGradient.position', v)}
            onColorChange={(v) => setNestedData('heroGallery.cornerGradient.color', v)}
            onOpacityChange={(v) => setNestedData('heroGallery.cornerGradient.opacity', v)}
            onSizeChange={(v) => setNestedData('heroGallery.cornerGradient.size', v)}
          />
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
