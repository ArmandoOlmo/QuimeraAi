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


export const renderHeroGalleryControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.heroGallery) return null;

  const slides = data.heroGallery.slides || [];

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
              <TextArea value={slide.headline || ''} onChange={(e) => setNestedData(`heroGallery.slides.${slideIndex}.headline`, e.target.value)} rows={2} />
            </AIFormControl>

            {/* Subheadline */}
            <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: `heroGallery.slides.${slideIndex}.subheadline`, value: slide.subheadline || '', context: 'Hero Gallery Subheadline' })}>
              <Input label="" value={slide.subheadline || ''} onChange={(e) => setNestedData(`heroGallery.slides.${slideIndex}.subheadline`, e.target.value)} />
            </AIFormControl>

            {/* CTAs */}
            <div className="bg-editor-panel-bg/50 p-3 rounded-md border border-editor-border mt-3">
              <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <Link size={12} />
                Call to Actions
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Input label="Primary CTA" value={slide.primaryCta || ''} onChange={(e) => setNestedData(`heroGallery.slides.${slideIndex}.primaryCta`, e.target.value)} />
                <Input label="Primary Link" value={slide.primaryCtaLink || ''} onChange={(e) => setNestedData(`heroGallery.slides.${slideIndex}.primaryCtaLink`, e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Secondary CTA" value={slide.secondaryCta || ''} onChange={(e) => setNestedData(`heroGallery.slides.${slideIndex}.secondaryCta`, e.target.value)} />
                <Input label="Secondary Link" value={slide.secondaryCtaLink || ''} onChange={(e) => setNestedData(`heroGallery.slides.${slideIndex}.secondaryCtaLink`, e.target.value)} />
              </div>
            </div>

            {/* Background Image */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <Image size={12} />
                Background Image
              </label>
              <ImagePicker
                label="Slide Background"
                value={slide.backgroundImage || ''}
                onChange={(url) => setNestedData(`heroGallery.slides.${slideIndex}.backgroundImage`, url)}
                onRemove={() => setNestedData(`heroGallery.slides.${slideIndex}.backgroundImage`, '')}
              />
            </div>

            {/* Per-Slide Fallback Background Color */}
            <div className="mt-3">
              <ColorControl label="Fallback Color" value={slide.backgroundColor || data.heroGallery.colors?.background || '#8B6F5C'} onChange={(v) => setNestedData(`heroGallery.slides.${slideIndex}.backgroundColor`, v)} />
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
              backgroundColor: data.heroGallery.colors?.background || '#8B6F5C',
            };
            setNestedData('heroGallery.slides', [...slides, newSlide]);
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
          label="Glassmorphism / Transparencia"
          checked={data?.heroGallery?.glassEffect || false}
          onChange={(v) => setNestedData('heroGallery.glassEffect', v)}
        />
      </div>
      {/* Overlay & Grain */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Image Overlay
        </label>

        {/* Overlay Opacity */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">Overlay Darkness</label>
            <span className="text-xs text-editor-text-primary">{Math.round((data.heroGallery.overlayOpacity ?? 0.35) * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="80" step="5"
            value={Math.round((data.heroGallery.overlayOpacity ?? 0.35) * 100)}
            onChange={(e) => setNestedData('heroGallery.overlayOpacity', parseInt(e.target.value) / 100)}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        <ToggleControl label="Grain Texture" checked={data.heroGallery.showGrain ?? true} onChange={(v) => setNestedData('heroGallery.showGrain', v)} />
      </div>

      {/* Layout */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Layout
        </label>

        {/* Hero Height */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-editor-text-secondary">Hero Height</label>
            <span className="text-xs text-editor-text-primary">{data.heroGallery.heroHeight || 80}vh</span>
          </div>
          <input
            type="range" min="50" max="100" step="5"
            value={data.heroGallery.heroHeight || 80}
            onChange={(e) => setNestedData('heroGallery.heroHeight', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        <FontSizeSelector label={t('controls.headlineSize')} value={data.heroGallery.headlineFontSize || 'lg'} onChange={(v) => setNestedData('heroGallery.headlineFontSize', v)} />
        <FontSizeSelector label={t('controls.subheadlineSize')} value={data.heroGallery.subheadlineFontSize || 'md'} onChange={(v) => setNestedData('heroGallery.subheadlineFontSize', v)} />
      </div>

      {/* Slideshow Settings */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <PlaySquare size={14} />
          Slideshow
        </label>

        <div className="mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Autoplay Speed (ms)</label>
          <input
            type="number" min="2000" max="15000" step="500"
            value={data.heroGallery.autoPlaySpeed || 6000}
            onChange={(e) => setNestedData('heroGallery.autoPlaySpeed', parseInt(e.target.value))}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Transition Duration (ms)</label>
          <input
            type="number" min="300" max="2000" step="100"
            value={data.heroGallery.transitionDuration || 800}
            onChange={(e) => setNestedData('heroGallery.transitionDuration', parseInt(e.target.value))}
            className="w-full bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Navigation</label>
        <ToggleControl label="Show Arrows" checked={data.heroGallery.showArrows ?? true} onChange={(v) => setNestedData('heroGallery.showArrows', v)} />
        <ToggleControl label="Show Dots" checked={data.heroGallery.showDots ?? true} onChange={(v) => setNestedData('heroGallery.showDots', v)} />

        {(data.heroGallery.showDots ?? true) && (
          <Select
            label="Dot Style"
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
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>

        <div className="space-y-3">
          <ColorControl label="Fallback Background" value={data.heroGallery.colors?.background || '#8B6F5C'} onChange={(v) => setNestedData('heroGallery.colors.background', v)} />
          <ColorControl label="Headline" value={data.heroGallery.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.heading', v)} />
          <ColorControl label="Text" value={data.heroGallery.colors?.text || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.text', v)} />
          <ColorControl label="CTA Text" value={data.heroGallery.colors?.ctaText || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.ctaText', v)} />

          {(data.heroGallery.showArrows ?? true) && (
            <>
              <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold mt-2">Arrows</p>
              <ColorControl label="Arrow Color" value={data.heroGallery.colors?.arrowColor || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.arrowColor', v)} />
            </>
          )}

          {(data.heroGallery.showDots ?? true) && (
            <>
              <p className="text-[10px] text-editor-text-secondary uppercase tracking-wider font-bold mt-2">Dots</p>
              <ColorControl label="Active Dot" value={data.heroGallery.colors?.dotActive || '#ffffff'} onChange={(v) => setNestedData('heroGallery.colors.dotActive', v)} />
              <ColorControl label="Inactive Dot" value={data.heroGallery.colors?.dotInactive || 'rgba(255,255,255,0.5)'} onChange={(v) => setNestedData('heroGallery.colors.dotInactive', v)} />
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
