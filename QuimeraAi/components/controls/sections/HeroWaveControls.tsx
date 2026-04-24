/**
 * HeroWaveControls.tsx
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
import { Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector } from '../../ui/EditorControlPrimitives';
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


export const renderHeroWaveControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.heroWave) return null;

  const slides = data.heroWave.slides || [];

  const contentTab = (
    <div className="space-y-4">
      {/* Slides */}
      <div>
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <PlaySquare size={14} />
          Slides ({slides.length})
        </label>

        {slides.map((slide: any, slideIndex: number) => (
          <div key={slideIndex} className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-editor-accent uppercase">Slide #{slideIndex + 1}</span>
              {slides.length > 1 && (
                <button
                  onClick={() => {
                    const newSlides = slides.filter((_: any, i: number) => i !== slideIndex);
                    setNestedData('heroWave.slides', newSlides);
                  }}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  title="Remove slide"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Headline */}
            <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: `heroWave.slides.${slideIndex}.headline`, value: slide.headline, context: 'Hero Wave Headline' })}>
              <TextArea value={slide.headline || ''} onChange={(e) => setNestedData(`heroWave.slides.${slideIndex}.headline`, e.target.value)} rows={2} />
            </AIFormControl>

            {/* Subheadline */}
            <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: `heroWave.slides.${slideIndex}.subheadline`, value: slide.subheadline || '', context: 'Hero Wave Subheadline' })}>
              <Input label="" value={slide.subheadline || ''} onChange={(e) => setNestedData(`heroWave.slides.${slideIndex}.subheadline`, e.target.value)} />
            </AIFormControl>

            {/* CTAs */}
            <div className="bg-editor-panel-bg/50 p-3 rounded-md border border-editor-border mt-3">
              <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <Link size={12} />
                Call to Actions
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Input label={t('controls.primaryCta')} value={slide.primaryCta || ''} onChange={(e) => setNestedData(`heroWave.slides.${slideIndex}.primaryCta`, e.target.value)} />
                <Input label={t('controls.primaryLink')} value={slide.primaryCtaLink || ''} onChange={(e) => setNestedData(`heroWave.slides.${slideIndex}.primaryCtaLink`, e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label={t('controls.secondaryCta')} value={slide.secondaryCta || ''} onChange={(e) => setNestedData(`heroWave.slides.${slideIndex}.secondaryCta`, e.target.value)} />
                <Input label={t('controls.secondaryLink')} value={slide.secondaryCtaLink || ''} onChange={(e) => setNestedData(`heroWave.slides.${slideIndex}.secondaryCtaLink`, e.target.value)} />
              </div>
            </div>

            {/* Background Image */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <Image size={12} />
                Background Image (Optional)
              </label>
              <ImagePicker
                label={t('controls.slideBackground')}
                value={slide.backgroundImage || ''}
                onChange={(url) => setNestedData(`heroWave.slides.${slideIndex}.backgroundImage`, url)}
                onRemove={() => setNestedData(`heroWave.slides.${slideIndex}.backgroundImage`, '')}
              />
            </div>
          </div>
        ))}

        {/* Add Slide Button */}
        <button
          onClick={() => {
            const newSlide = {
              headline: 'New Slide Headline',
              subheadline: 'Subtitle here',
              primaryCta: 'SHOP NOW',
              primaryCtaLink: '/#products',
              secondaryCta: '',
              secondaryCtaLink: '',
              backgroundImage: '',
              backgroundColor: '',
            };
            setNestedData('heroWave.slides', [...slides, newSlide]);
          }}
          className="w-full py-2 bg-editor-accent text-editor-bg rounded-md hover:bg-editor-accent/90 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Plus size={16} /> Add Slide
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
          label={t('controls.glassmorphismTransparencia')}
          checked={data?.heroWave?.glassEffect || false}
          onChange={(v) => setNestedData('heroWave.glassEffect', v)}
        />
      </div>
      {/* Gradient Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Gradient Colors
        </label>

        {(data.heroWave.gradientColors || ['#ff006e', '#fb5607', '#ffbe0b', '#38b000', '#00b4d8']).map(
          (color: string, i: number) => (
            <div key={i} className="relative mb-2">
              <ColorControl
                label={`Stop ${i + 1}`}
                value={color}
                onChange={(v) => {
                  const newColors = [...(data.heroWave.gradientColors || ['#ff006e', '#fb5607', '#ffbe0b', '#38b000', '#00b4d8'])];
                  newColors[i] = v;
                  setNestedData('heroWave.gradientColors', newColors);
                }}
              />
              {(data.heroWave.gradientColors || []).length > 2 && (
                <button
                  onClick={() => {
                    const newColors = [...(data.heroWave.gradientColors || [])].filter((_: any, idx: number) => idx !== i);
                    setNestedData('heroWave.gradientColors', newColors);
                  }}
                  className="absolute top-1 right-0 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  title="Remove color stop"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )
        )}
        <button
          onClick={() => {
            const newColors = [...(data.heroWave.gradientColors || ['#ff006e', '#fb5607', '#ffbe0b', '#38b000', '#00b4d8']), '#8b5cf6'];
            setNestedData('heroWave.gradientColors', newColors);
          }}
          className="w-full py-1.5 border border-dashed border-editor-border text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent rounded-md transition-colors flex items-center justify-center gap-1 text-xs mt-2"
        >
          <Plus size={12} /> Add Color Stop
        </button>

        {/* Gradient Angle */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">{t('controls.gradientAngle')}</label>
            <span className="text-xs text-editor-text-primary">{data.heroWave.gradientAngle || 135}°</span>
          </div>
          <input
            type="range" min="0" max="360" step="15"
            value={data.heroWave.gradientAngle || 135}
            onChange={(e) => setNestedData('heroWave.gradientAngle', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>
      </div>

      {/* Wave Shape */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Wave Shape
        </label>

        <Select
          label={t('controls.waveStyle')}
          value={data.heroWave.waveShape || 'bubbly'}
          onChange={(v) => setNestedData('heroWave.waveShape', v)}
          options={[
            { value: 'smooth', label: '〰️ Smooth' },
            { value: 'bubbly', label: '🫧 Bubbly' },
            { value: 'sharp', label: '⚡ Sharp' },
            { value: 'layered', label: '🌊 Layered' },
          ]}
        />

        <ColorControl label={t('controls.waveColor')} value={data.heroWave.waveColor || '#ffffff'} onChange={(v) => setNestedData('heroWave.waveColor', v)} />
      </div>

      {/* Text Options */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          Text Options
        </label>

        <div className="mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('controls.textAlignment')}</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
            {(['left', 'center', 'right'] as const).map(align => (
              <button
                key={align}
                onClick={() => setNestedData('heroWave.textAlign', align)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.heroWave.textAlign || 'center') === align ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
              >
                {align}
              </button>
            ))}
          </div>
        </div>

        <ToggleControl label={t('controls.textStrokeEffect')} checked={data.heroWave.showTextStroke ?? false} onChange={(v) => setNestedData('heroWave.showTextStroke', v)} />

        <FontSizeSelector label={t('controls.headlineSize')} value={data.heroWave.headlineFontSize || 'xl'} onChange={(v) => setNestedData('heroWave.headlineFontSize', v)} />
        <FontSizeSelector label={t('controls.subheadlineSize')} value={data.heroWave.subheadlineFontSize || 'md'} onChange={(v) => setNestedData('heroWave.subheadlineFontSize', v)} />
      </div>

      {/* Overlay & Grain */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3">{t('controls.imageOverlay')}</label>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">{t('controls.overlayDarkness')}</label>
            <span className="text-xs text-editor-text-primary">{Math.round((data.heroWave.overlayOpacity ?? 0.15) * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="80" step="5"
            value={Math.round((data.heroWave.overlayOpacity ?? 0.15) * 100)}
            onChange={(e) => setNestedData('heroWave.overlayOpacity', parseInt(e.target.value) / 100)}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        <ToggleControl label={t('controls.grainTexture')} checked={data.heroWave.showGrain ?? false} onChange={(v) => setNestedData('heroWave.showGrain', v)} />

        {/* Image Focus Position */}
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
                onClick={() => setNestedData('heroWave.bgPosition', pos.id)}
                className={`w-8 h-8 flex items-center justify-center rounded-sm transition-all text-sm ${(data?.heroWave?.bgPosition || 'center center') === pos.id
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
      </div>

      {/* Layout */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3">{t('controls.layout')}</label>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">{t('controls.heroHeight')}</label>
            <span className="text-xs text-editor-text-primary">{data.heroWave.heroHeight || 75}vh</span>
          </div>
          <input
            type="range" min="50" max="100" step="5"
            value={data.heroWave.heroHeight || 75}
            onChange={(e) => setNestedData('heroWave.heroHeight', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>
      </div>

      {/* Slideshow */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <PlaySquare size={14} />
          Slideshow
        </label>

        <div className="mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('controls.autoplaySpeedMs')}</label>
          <input
            type="number" min="2000" max="15000" step="500"
            value={data.heroWave.autoPlaySpeed || 6000}
            onChange={(e) => setNestedData('heroWave.autoPlaySpeed', parseInt(e.target.value))}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('controls.transitionDurationMs')}</label>
          <input
            type="number" min="300" max="2000" step="100"
            value={data.heroWave.transitionDuration || 800}
            onChange={(e) => setNestedData('heroWave.transitionDuration', parseInt(e.target.value))}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.navigation')}</label>
        <ToggleControl label={t('controls.showArrows')} checked={data.heroWave.showArrows ?? true} onChange={(v) => setNestedData('heroWave.showArrows', v)} />
        <ToggleControl label={t('controls.showDots')} checked={data.heroWave.showDots ?? true} onChange={(v) => setNestedData('heroWave.showDots', v)} />

        {(data.heroWave.showDots ?? true) && (
          <Select
            label={t('controls.dotStyle')}
            value={data.heroWave.dotStyle || 'circle'}
            onChange={(val) => setNestedData('heroWave.dotStyle', val)}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'line', label: 'Line' },
            ]}
            noMargin
          />
        )}
      </div>

      {/* Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Text & Button Colors
        </label>

        <div className="space-y-3">
          <ColorControl label={t('controls.headline')} value={data.heroWave.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('heroWave.colors.heading', v)} />
          <ColorControl label={t('controls.text')} value={data.heroWave.colors?.text || '#ffffff'} onChange={(v) => setNestedData('heroWave.colors.text', v)} />
          <ColorControl label={t('controls.ctaText')} value={data.heroWave.colors?.ctaText || '#ffffff'} onChange={(v) => setNestedData('heroWave.colors.ctaText', v)} />
          <ColorControl label={t('controls.ctaBackground')} value={(data.heroWave.colors as any)?.ctaBackground || 'rgba(255,255,255,0.2)'} onChange={(v) => setNestedData('heroWave.colors.ctaBackground', v)} />

          {(data.heroWave.showArrows ?? true) && (
            <>
              <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold mt-2">Arrows</p>
              <ColorControl label={t('controls.arrowColor')} value={data.heroWave.colors?.arrowColor || '#ffffff'} onChange={(v) => setNestedData('heroWave.colors.arrowColor', v)} />
            </>
          )}

          {(data.heroWave.showDots ?? true) && (
            <>
              <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold mt-2">Dots</p>
              <ColorControl label={t('controls.activeDot')} value={data.heroWave.colors?.dotActive || '#ffffff'} onChange={(v) => setNestedData('heroWave.colors.dotActive', v)} />
              <ColorControl label={t('controls.inactiveDot')} value={data.heroWave.colors?.dotInactive || 'rgba(255,255,255,0.5)'} onChange={(v) => setNestedData('heroWave.colors.dotInactive', v)} />
            </>
          )}

          {/* Corner Gradient */}
          <CornerGradientControl
            enabled={data.heroWave.cornerGradient?.enabled || false}
            position={data.heroWave.cornerGradient?.position || 'top-left'}
            color={data.heroWave.cornerGradient?.color || '#4f46e5'}
            opacity={data.heroWave.cornerGradient?.opacity || 30}
            size={data.heroWave.cornerGradient?.size || 50}
            onEnabledChange={(v) => setNestedData('heroWave.cornerGradient.enabled', v)}
            onPositionChange={(v) => setNestedData('heroWave.cornerGradient.position', v)}
            onColorChange={(v) => setNestedData('heroWave.cornerGradient.color', v)}
            onOpacityChange={(v) => setNestedData('heroWave.cornerGradient.opacity', v)}
            onSizeChange={(v) => setNestedData('heroWave.cornerGradient.size', v)}
          />
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
