/**
 * HeroNovaControls.tsx
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


export const renderHeroNovaControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.heroNova) return null;

  const slides = data.heroNova.slides || [];

  const contentTab = (
    <div className="space-y-4">
      {/* Display Text */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <Type size={14} />
          Display Text (centered)
        </label>
        <Input
          label=""
          value={data.heroNova.displayText || ''}
          onChange={(e) => setNestedData('heroNova.displayText', e.target.value)}
        />
        <ToggleControl
          label="Show Display Text"
          checked={data.heroNova.showDisplayText ?? true}
          onChange={(v) => setNestedData('heroNova.showDisplayText', v)}
        />
      </div>

      {/* Slides */}
      <div>
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <PlaySquare size={14} />
          Slides ({slides.length})
        </label>

        {slides.map((slide: any, slideIndex: number) => {
          const mediaType = slide.mediaType || 'image';
          return (
            <div key={slideIndex} className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-editor-accent uppercase">Slide #{slideIndex + 1}</span>
                {slides.length > 1 && (
                  <button
                    onClick={() => {
                      const newSlides = slides.filter((_: any, i: number) => i !== slideIndex);
                      setNestedData('heroNova.slides', newSlides);
                    }}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    title="Remove slide"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Headline */}
              <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: `heroNova.slides.${slideIndex}.headline`, value: slide.headline, context: 'Hero Nova Headline' })}>
                <TextArea value={slide.headline || ''} onChange={(e) => setNestedData(`heroNova.slides.${slideIndex}.headline`, e.target.value)} rows={2} />
              </AIFormControl>

              {/* Subheadline */}
              <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: `heroNova.slides.${slideIndex}.subheadline`, value: slide.subheadline || '', context: 'Hero Nova Subheadline' })}>
                <Input label="" value={slide.subheadline || ''} onChange={(e) => setNestedData(`heroNova.slides.${slideIndex}.subheadline`, e.target.value)} />
              </AIFormControl>

              {/* CTA */}
              <div className="bg-editor-panel-bg/50 p-3 rounded-md border border-editor-border mt-3">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Link size={12} />
                  Call to Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Button Text" value={slide.primaryCta || ''} onChange={(e) => setNestedData(`heroNova.slides.${slideIndex}.primaryCta`, e.target.value)} />
                  <Input label="Button Link" value={slide.primaryCtaLink || ''} onChange={(e) => setNestedData(`heroNova.slides.${slideIndex}.primaryCtaLink`, e.target.value)} />
                </div>
              </div>

              {/* Media Type Toggle */}
              <div className="mt-3">
                <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
                  Media Type
                </label>
                <div className="flex bg-editor-panel-bg p-1 rounded-md border border-editor-border">
                  {(['image', 'video'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNestedData(`heroNova.slides.${slideIndex}.mediaType`, type)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-sm capitalize transition-colors ${mediaType === type ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                    >
                      {type === 'image' ? '🖼️ Image' : '🎬 Video'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional: Image or Video picker */}
              <div className="mt-3">
                {mediaType === 'image' ? (
                  <>
                    <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Image size={12} />
                      Background Image
                    </label>
                    <ImagePicker
                      label="Slide Image"
                      value={slide.backgroundImage || ''}
                      onChange={(url) => setNestedData(`heroNova.slides.${slideIndex}.backgroundImage`, url)}
                      onRemove={() => setNestedData(`heroNova.slides.${slideIndex}.backgroundImage`, '')}
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                      <MonitorPlay size={12} />
                      Video URL
                    </label>
                    <Input
                      label=""
                      value={slide.backgroundVideo || ''}
                      onChange={(e) => setNestedData(`heroNova.slides.${slideIndex}.backgroundVideo`, e.target.value)}
                    />
                    <p className="text-[10px] text-editor-text-secondary mt-1">Paste a direct video URL (MP4, WebM)</p>
                  </>
                )}
              </div>

              {/* Fallback Color */}
              <div className="mt-3">
                <ColorControl
                  label="Fallback Color"
                  value={slide.backgroundColor || '#1a1a1a'}
                  onChange={(v) => setNestedData(`heroNova.slides.${slideIndex}.backgroundColor`, v)}
                />
              </div>
            </div>
          );
        })}

        {/* Add Slide */}
        <button
          onClick={() => {
            const newSlide = {
              headline: 'New Slide',
              subheadline: '',
              primaryCta: 'SHOP NOW',
              primaryCtaLink: '/#products',
              mediaType: 'image',
              backgroundImage: '',
              backgroundVideo: '',
              backgroundColor: '#1a1a1a',
            };
            setNestedData('heroNova.slides', [...slides, newSlide]);
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
      {/* Display Text Style */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          Display Text Style
        </label>

        <FontSizeSelector label="Display Size" value={data.heroNova.headlineFontSize || 'lg'} onChange={(v) => setNestedData('heroNova.headlineFontSize', v)} />

        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">Letter Spacing</label>
            <span className="text-xs text-editor-text-primary">{(data.heroNova.displayLetterSpacing ?? 0.35).toFixed(2)}em</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05"
            value={data.heroNova.displayLetterSpacing ?? 0.35}
            onChange={(e) => setNestedData('heroNova.displayLetterSpacing', parseFloat(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>
      </div>

      {/* Overlay */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3">Overlay</label>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">Overlay Darkness</label>
            <span className="text-xs text-editor-text-primary">{Math.round((data.heroNova.overlayOpacity ?? 0.35) * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="80" step="5"
            value={Math.round((data.heroNova.overlayOpacity ?? 0.35) * 100)}
            onChange={(e) => setNestedData('heroNova.overlayOpacity', parseInt(e.target.value) / 100)}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>
      </div>

      {/* Layout */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3">Layout</label>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">Hero Height</label>
            <span className="text-xs text-editor-text-primary">{data.heroNova.heroHeight || 90}vh</span>
          </div>
          <input
            type="range" min="50" max="100" step="5"
            value={data.heroNova.heroHeight || 90}
            onChange={(e) => setNestedData('heroNova.heroHeight', parseInt(e.target.value))}
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
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Autoplay Speed (ms)</label>
          <input
            type="number" min="2000" max="15000" step="500"
            value={data.heroNova.autoPlaySpeed || 6000}
            onChange={(e) => setNestedData('heroNova.autoPlaySpeed', parseInt(e.target.value))}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Transition Duration (ms)</label>
          <input
            type="number" min="300" max="2000" step="100"
            value={data.heroNova.transitionDuration || 700}
            onChange={(e) => setNestedData('heroNova.transitionDuration', parseInt(e.target.value))}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Navigation</label>
        <ToggleControl label="Show Arrows" checked={data.heroNova.showArrows ?? true} onChange={(v) => setNestedData('heroNova.showArrows', v)} />
        <ToggleControl label="Show Dots" checked={data.heroNova.showDots ?? true} onChange={(v) => setNestedData('heroNova.showDots', v)} />

        {(data.heroNova.showDots ?? true) && (
          <Select
            label="Dot Style"
            value={data.heroNova.dotStyle || 'circle'}
            onChange={(val) => setNestedData('heroNova.dotStyle', val)}
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
          Colors
        </label>

        <div className="space-y-3">
          <ColorControl label="Background" value={data.heroNova.colors?.background || '#1a1a1a'} onChange={(v) => setNestedData('heroNova.colors.background', v)} />
          <ColorControl label="Display Text" value={data.heroNova.colors?.displayText || 'rgba(255,255,255,0.85)'} onChange={(v) => setNestedData('heroNova.colors.displayText', v)} />
          <ColorControl label="Headline" value={data.heroNova.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('heroNova.colors.heading', v)} />
          <ColorControl label="Text" value={data.heroNova.colors?.text || '#ffffff'} onChange={(v) => setNestedData('heroNova.colors.text', v)} />
          <ColorControl label="CTA Text" value={data.heroNova.colors?.ctaText || '#1a1a1a'} onChange={(v) => setNestedData('heroNova.colors.ctaText', v)} />
          <ColorControl label="CTA Background" value={data.heroNova.colors?.ctaBackground || '#ffffff'} onChange={(v) => setNestedData('heroNova.colors.ctaBackground', v)} />

          {(data.heroNova.showArrows ?? true) && (
            <ColorControl label="Arrow Color" value={data.heroNova.colors?.arrowColor || '#ffffff'} onChange={(v) => setNestedData('heroNova.colors.arrowColor', v)} />
          )}
          {(data.heroNova.showDots ?? true) && (
            <>
              <ColorControl label="Active Dot" value={data.heroNova.colors?.dotActive || '#ffffff'} onChange={(v) => setNestedData('heroNova.colors.dotActive', v)} />
              <ColorControl label="Inactive Dot" value={data.heroNova.colors?.dotInactive || 'rgba(255,255,255,0.4)'} onChange={(v) => setNestedData('heroNova.colors.dotInactive', v)} />
            </>
          )}

          {/* Corner Gradient */}
          <CornerGradientControl
            enabled={data.heroNova.cornerGradient?.enabled || false}
            position={data.heroNova.cornerGradient?.position || 'top-left'}
            color={data.heroNova.cornerGradient?.color || '#4f46e5'}
            opacity={data.heroNova.cornerGradient?.opacity || 30}
            size={data.heroNova.cornerGradient?.size || 50}
            onEnabledChange={(v) => setNestedData('heroNova.cornerGradient.enabled', v)}
            onPositionChange={(v) => setNestedData('heroNova.cornerGradient.position', v)}
            onColorChange={(v) => setNestedData('heroNova.cornerGradient.color', v)}
            onOpacityChange={(v) => setNestedData('heroNova.cornerGradient.opacity', v)}
            onSizeChange={(v) => setNestedData('heroNova.cornerGradient.size', v)}
          />
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
