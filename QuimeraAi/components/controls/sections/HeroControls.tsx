/**
 * HeroControls.tsx
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


export const renderHeroControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls: renderListSectionControlsFn } = deps;
  if (!data?.hero) return null;

  return (
    <div className="space-y-4">
      {/* ========== TEXT LAYOUT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Ubicación del Texto
        </label>
        {/* Visual 3x3 position grid */}
        <div className="relative bg-editor-bg rounded-lg border border-editor-border p-3">
          {/* Preview area with position indicator */}
          <div className="relative aspect-video bg-gradient-to-br from-editor-panel-bg to-editor-bg rounded-md border border-editor-border/50 overflow-hidden mb-2">
            {/* Decorative lines representing text */}
            {(() => {
              const tl = data.hero.textLayout || 'left-top';
              const isLeft = tl.startsWith('left');
              const isRight = tl.startsWith('right');
              const isTop = tl.endsWith('-top') || tl === 'center-top';
              const isBottom = tl.endsWith('-bottom') || tl === 'center-bottom';
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
          {/* 3x3 clickable grid */}
          <div className="grid grid-cols-3 gap-1">
            {([
              { value: 'left-top',      row: 0, col: 0 },
              { value: 'center-top',    row: 0, col: 1 },
              { value: 'right-top',     row: 0, col: 2 },
              { value: 'center',        row: 1, col: 1 },
              { value: 'left-bottom',   row: 2, col: 0 },
              { value: 'center-bottom', row: 2, col: 1 },
              { value: 'right-bottom',  row: 2, col: 2 },
            ] as const).map(pos => {
              const isSelected = (data.hero.textLayout || 'left-top') === pos.value;
              const labels: Record<string, string> = {
                'left-top': 'Arriba Izquierda', 'center-top': 'Arriba Centro', 'right-top': 'Arriba Derecha',
                'center': 'Centro',
                'left-bottom': 'Abajo Izquierda', 'center-bottom': 'Abajo Centro', 'right-bottom': 'Abajo Derecha',
              };
              return (
                <button
                  key={pos.value}
                  title={labels[pos.value]}
                  onClick={() => setNestedData('hero.textLayout', pos.value)}
                  className={`flex items-center justify-center h-7 rounded transition-all duration-200 ${
                    isSelected
                      ? 'bg-editor-accent/20 border border-editor-accent/50'
                      : 'bg-editor-panel-bg/50 border border-transparent hover:bg-editor-border/50 hover:border-editor-border'
                  }`}
                  style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
                >
                  <div className={`rounded-full transition-all duration-200 ${
                    isSelected
                      ? 'w-2.5 h-2.5 bg-editor-accent shadow-[0_0_8px_var(--editor-accent)]'
                      : 'w-1.5 h-1.5 bg-editor-text-secondary/40'
                  }`} />
                </button>
              );
            })}
            {/* Empty cells for middle row left/right (no left-center or right-center options) */}
            <div className="h-7" style={{ gridRow: 2, gridColumn: 1 }} />
            <div className="h-7" style={{ gridRow: 2, gridColumn: 3 }} />
          </div>
        </div>
      </div>


      {/* ========== BACKGROUND IMAGE ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Image size={14} />
          Imagen de Fondo
        </label>

        {/* Prominent Image Preview with overlaid controls */}
        <div className="relative rounded-lg overflow-hidden border border-editor-border group">
          {data.hero.imageUrl ? (
            <>
              <div className="aspect-video">
                <img src={data.hero.imageUrl} alt="Hero Background" className="w-full h-full object-cover" />
              </div>
              {/* Bottom gradient for contrast behind controls */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
              {/* Overlaid action buttons at bottom-right */}
              <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                <button
                  onClick={() => setShowHeroImagePicker(true)}
                  className="p-2 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-all duration-200"
                  title="Librería de Imágenes"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setShowHeroImagePicker(true)}
                  className="p-2 rounded-lg bg-editor-accent/80 backdrop-blur-md border border-editor-accent/40 text-white hover:bg-editor-accent transition-all duration-200"
                  title="Generar con IA"
                >
                  <Zap size={14} />
                </button>
                <button
                  onClick={() => setNestedData('hero.imageUrl', '')}
                  className="p-2 rounded-lg bg-red-500/60 backdrop-blur-md border border-red-500/30 text-white hover:bg-red-500/80 transition-all duration-200"
                  title="Eliminar imagen"
                >
                  <X size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center bg-editor-bg text-editor-text-secondary gap-2">
              <Image size={32} className="opacity-30" />
              <span className="text-[10px] uppercase tracking-wider opacity-50">Sin imagen</span>
            </div>
          )}
        </div>

        {/* ImagePicker rendered with defaultOpen when triggered */}
        {showHeroImagePicker && (
          <ImagePicker
            label=""
            value={data.hero.imageUrl}
            onChange={(url) => setNestedData('hero.imageUrl', url)}
            generationContext="background"
            defaultOpen
            onClose={() => setShowHeroImagePicker(false)}
          />
        )}

        {/* Action row when no image */}
        {!data.hero.imageUrl && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowHeroImagePicker(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-bg border border-editor-border text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent/30 transition-all text-xs font-medium"
            >
              <Grid size={12} /> Librería
            </button>
            <button
              onClick={() => setShowHeroImagePicker(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-accent/10 border border-editor-accent/20 text-editor-accent hover:bg-editor-accent/20 transition-all text-xs font-medium"
            >
              <Zap size={12} /> Generar IA
            </button>
          </div>
        )}

        {/* Overlay Opacity */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-editor-text-secondary">Oscurecimiento</span>
            <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{data.hero.overlayOpacity ?? 50}%</span>
          </div>
          <input
            type="range" min="0" max="100" step="5"
            value={data.hero.overlayOpacity ?? 50}
            onChange={(e) => setNestedData('hero.overlayOpacity', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-editor-text-secondary/50">Claro</span>
            <span className="text-[9px] text-editor-text-secondary/50">Oscuro</span>
          </div>
        </div>
      </div>


      {/* ========== HERO HEIGHT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <AlignJustify size={14} />
          {t('controls.heroHeight')}
        </label>
        <div className="bg-editor-bg/50 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-editor-text-secondary">{t('controls.sectionHeight')}</span>
            <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">
              {data.hero.heroHeight ? `${data.hero.heroHeight}vh` : t('controls.auto')}
            </span>
          </div>
          <input
            type="range" min="0" max="100" step="5"
            value={data.hero.heroHeight ?? 0}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setNestedData('hero.heroHeight', val === 0 ? undefined : val);
            }}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-editor-text-secondary/50">{t('controls.auto')}</span>
            <span className="text-[9px] text-editor-text-secondary/50">100vh</span>
          </div>
        </div>
      </div>


      {/* ========== CONTENT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('controls.content')}
        </label>

        <AIFormControl label={t('editor.controls.hero.headline')} onAssistClick={() => setAiAssistField({ path: 'hero.headline', value: data.hero.headline, context: 'Hero Headline' })}>
          <TextArea value={data.hero.headline} onChange={(e) => setNestedData('hero.headline', e.target.value)} rows={2} />
        </AIFormControl>
        <FontSizeSelector label={`${t('editor.controls.hero.headline')} ${t('editor.controls.common.size', { defaultValue: 'Size' })}`} value={data.hero.headlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.headlineFontSize', v)} />

        <AIFormControl label={t('editor.controls.hero.subheadline')} onAssistClick={() => setAiAssistField({ path: 'hero.subheadline', value: data.hero.subheadline, context: 'Hero Subheadline' })}>
          <TextArea value={data.hero.subheadline} onChange={(e) => setNestedData('hero.subheadline', e.target.value)} rows={3} />
        </AIFormControl>
        <FontSizeSelector label={`${t('editor.controls.hero.subheadline')} ${t('editor.controls.common.size', { defaultValue: 'Size' })}`} value={data.hero.subheadlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.subheadlineFontSize', v)} />

        <div className="grid grid-cols-2 gap-4">
          <Input label={t('editor.controls.hero.primaryCta')} value={data.hero.primaryCta} onChange={(e) => setNestedData('hero.primaryCta', e.target.value)} />
          <Input label={t('editor.controls.hero.secondaryCta')} value={data.hero.secondaryCta} onChange={(e) => setNestedData('hero.secondaryCta', e.target.value)} />
        </div>
      </div>


      {/* ========== COLORS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Settings size={14} />
          {t('editor.controls.common.colors')}
        </label>

        <div className="space-y-3">
          <ColorControl label={t('editor.controls.common.background')} value={data.hero.colors?.background} onChange={(v) => setNestedData('hero.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.hero.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('hero.colors.heading', v)} />
          <ColorControl label={t('editor.controls.common.text')} value={data.hero.colors?.text} onChange={(v) => setNestedData('hero.colors.text', v)} />
          <ColorControl label={t('editor.controls.common.accent', { defaultValue: 'Primary Accent' })} value={data.hero.colors?.primary} onChange={(v) => setNestedData('hero.colors.primary', v)} />

          <div className="pt-2">
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.primaryButton')}</h5>
            <div className="space-y-1">
              <ColorControl label={t('editor.background')} value={data.hero.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('hero.colors.buttonBackground', v)} />
              <ColorControl label={t('editor.text')} value={data.hero.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('hero.colors.buttonText', v)} />
            </div>
          </div>

          <div className="pt-2">
            <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.secondaryButton')}</h5>

            {/* Button Style Selector */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-editor-text-secondary mb-1">{t('editor.controls.common.style')}</label>
              <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
                {['solid', 'outline', 'ghost'].map(style => (
                  <button
                    key={style}
                    onClick={() => setNestedData('hero.secondaryButtonStyle', style)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.hero.secondaryButtonStyle || 'solid') === style
                      ? 'bg-editor-accent text-editor-bg'
                      : 'text-editor-text-secondary hover:bg-editor-border'
                      }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <ColorControl label={t('editor.background')} value={data.hero.colors?.secondaryButtonBackground || '#334155'} onChange={(v) => setNestedData('hero.colors.secondaryButtonBackground', v)} />
              <ColorControl label={t('editor.text')} value={data.hero.colors?.secondaryButtonText || '#ffffff'} onChange={(v) => setNestedData('hero.colors.secondaryButtonText', v)} />
            </div>

            {/* Opacity Slider - only for solid style */}
            {(data.hero.secondaryButtonStyle || 'solid') === 'solid' && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-editor-text-secondary">Opacity</label>
                  <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{data.hero.secondaryButtonOpacity ?? 100}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="5"
                  value={data.hero.secondaryButtonOpacity ?? 100}
                  onChange={(e) => setNestedData('hero.secondaryButtonOpacity', parseInt(e.target.value))}
                  className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
                />
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

// ─── ─── ─── ─── ─── ─── ───

export const renderHeroControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls: renderListSectionControlsFn } = deps;
  if (!data?.hero) return null;
  const currentVariant = data.hero.heroVariant || 'classic';

  const contentTab = (
    <div className="space-y-4">
      {/* Content */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('controls.content')}
        </label>

        <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: 'hero.headline', value: data.hero.headline, context: 'Hero Headline' })}>
          <TextArea value={data.hero.headline} onChange={(e) => setNestedData('hero.headline', e.target.value)} rows={2} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.headlineSize')} value={data.hero.headlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.headlineFontSize', v)} />

        <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: 'hero.subheadline', value: data.hero.subheadline, context: 'Hero Subheadline' })}>
          <TextArea value={data.hero.subheadline} onChange={(e) => setNestedData('hero.subheadline', e.target.value)} rows={3} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.subheadlineSize')} value={data.hero.subheadlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.subheadlineFontSize', v)} />

        <div className="grid grid-cols-2 gap-4">
          <Input label={t('controls.primaryCTA')} value={data.hero.primaryCta} onChange={(e) => setNestedData('hero.primaryCta', e.target.value)} />
          <Input label={t('controls.secondaryCTA')} value={data.hero.secondaryCta} onChange={(e) => setNestedData('hero.secondaryCta', e.target.value)} />
        </div>
      </div>

      {/* Logo / Headline Image — optional override */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image size={14} />
          Logo / Imagen del Título (opcional)
        </label>
        <p className="text-xs text-editor-text-secondary mb-3">Si subes una imagen, se mostrará en lugar del texto del título.</p>
        <ImagePicker
          label="Logo del Título"
          value={data.hero.headlineImageUrl || ''}
          onChange={(url) => setNestedData('hero.headlineImageUrl', url)}
        />
        {data.hero.headlineImageUrl && (
          <button
            onClick={() => setNestedData('hero.headlineImageUrl', '')}
            className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
          >
            Quitar imagen y usar texto
          </button>
        )}
      </div>

      {/* Primary CTA Link */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Link size={14} />
          Enlace Botón Principal
        </label>

        {/* Link Type Selector */}
        <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
          {[
            { value: 'section', label: 'Sección' },
            { value: 'product', label: 'Producto' },
            { value: 'collection', label: 'Colección' },
            { value: 'content', label: 'Contenido' },
            { value: 'manual', label: 'URL' },
          ].map(type => (
            <button
              key={type.value}
              onClick={() => {
                setNestedData('hero.primaryCtaLinkType', type.value);
                if (type.value === 'section') {
                  setNestedData('hero.primaryCtaLink', '#cta');
                } else if (type.value !== 'manual') {
                  setNestedData('hero.primaryCtaLink', '');
                }
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${(data.hero.primaryCtaLinkType || 'section') === type.value
                ? 'bg-editor-accent text-editor-bg'
                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Section Selector */}
        {(data.hero.primaryCtaLinkType || 'section') === 'section' && (
            <Select
              value={data.hero.primaryCtaLink || '/#cta'}
              onChange={(val) => setNestedData('hero.primaryCtaLink', val)}
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
        {data.hero.primaryCtaLinkType === 'manual' && (
          <Input
            label=""
            value={data.hero.primaryCtaLink || ''}
            onChange={(e) => setNestedData('hero.primaryCtaLink', e.target.value)}
            placeholder="https://... o /pagina"
            className="mb-0"
          />
        )}

        {/* Product Picker */}
        {data.hero.primaryCtaLinkType === 'product' && (
          <SingleProductSelector
            storeId={activeProject?.id || ''}
            selectedProductId={data.hero.primaryCtaLink && (data.hero.primaryCtaLink.includes('/tienda/producto/') || data.hero.primaryCtaLink.includes('product/'))
              ? data.hero.primaryCtaLink.split('/').pop()
              : undefined}
            onSelect={(id) => {
              if (id) {
                setNestedData('hero.primaryCtaLink', `/product/${id}`);
              } else {
                setNestedData('hero.primaryCtaLink', '');
              }
            }}
            label={t('editor.controls.common.selectProduct')}
          />
        )}

        {/* Collection Picker */}
        {data.hero.primaryCtaLinkType === 'collection' && (
          <SingleCollectionSelector
            storeId={activeProject?.id || ''}
            gridCategories={data.categoryGrid?.categories || []}
            selectedCollectionId={data.hero.primaryCtaLink && (data.hero.primaryCtaLink.includes('/tienda/categoria/') || data.hero.primaryCtaLink.includes('category/'))
              ? data.hero.primaryCtaLink.split('/').pop()
              : undefined}
            onSelect={(id) => {
              if (id) {
                setNestedData('hero.primaryCtaLink', `/collection/${id}`);
              } else {
                setNestedData('hero.primaryCtaLink', '');
              }
            }}
            label="Seleccionar Colección"
          />
        )}

        {/* Content Picker */}
        {data.hero.primaryCtaLinkType === 'content' && (
          <SingleContentSelector
            selectedContentPath={data.hero.primaryCtaLink}
            onSelect={(path) => {
              setNestedData('hero.primaryCtaLink', path || '');
            }}
            label={t('editor.controls.common.selectContent')}
          />
        )}
      </div>

      {/* Secondary CTA Link */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Link size={14} />
          Enlace Botón Secundario
        </label>

        {/* Link Type Selector */}
        <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
          {[
            { value: 'section', label: 'Sección' },
            { value: 'product', label: 'Producto' },
            { value: 'collection', label: 'Colección' },
            { value: 'content', label: 'Contenido' },
            { value: 'manual', label: 'URL' },
          ].map(type => (
            <button
              key={type.value}
              onClick={() => {
                setNestedData('hero.secondaryCtaLinkType', type.value);
                if (type.value === 'section') {
                  setNestedData('hero.secondaryCtaLink', '#features');
                } else if (type.value !== 'manual') {
                  setNestedData('hero.secondaryCtaLink', '');
                }
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${(data.hero.secondaryCtaLinkType || 'section') === type.value
                ? 'bg-editor-accent text-editor-bg'
                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Section Selector */}
        {(data.hero.secondaryCtaLinkType || 'section') === 'section' && (
            <Select
              value={data.hero.secondaryCtaLink || '/#features'}
              onChange={(val) => setNestedData('hero.secondaryCtaLink', val)}
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
        {data.hero.secondaryCtaLinkType === 'manual' && (
          <Input
            label=""
            value={data.hero.secondaryCtaLink || ''}
            onChange={(e) => setNestedData('hero.secondaryCtaLink', e.target.value)}
            placeholder="https://... o /pagina"
            className="mb-0"
          />
        )}

        {/* Product Picker */}
        {data.hero.secondaryCtaLinkType === 'product' && (
          <SingleProductSelector
            storeId={activeProject?.id || ''}
            selectedProductId={data.hero.secondaryCtaLink && (data.hero.secondaryCtaLink.includes('/tienda/producto/') || data.hero.secondaryCtaLink.includes('product/'))
              ? data.hero.secondaryCtaLink.split('/').pop()
              : undefined}
            onSelect={(id) => {
              if (id) {
                setNestedData('hero.secondaryCtaLink', `/product/${id}`);
              } else {
                setNestedData('hero.secondaryCtaLink', '');
              }
            }}
            label={t('editor.controls.common.selectProduct')}
          />
        )}

        {/* Collection Picker */}
        {data.hero.secondaryCtaLinkType === 'collection' && (
          <SingleCollectionSelector
            storeId={activeProject?.id || ''}
            gridCategories={data.categoryGrid?.categories || []}
            selectedCollectionId={data.hero.secondaryCtaLink && (data.hero.secondaryCtaLink.includes('/tienda/categoria/') || data.hero.secondaryCtaLink.includes('category/'))
              ? data.hero.secondaryCtaLink.split('/').pop()
              : undefined}
            onSelect={(id) => {
              if (id) {
                setNestedData('hero.secondaryCtaLink', `/collection/${id}`);
              } else {
                setNestedData('hero.secondaryCtaLink', '');
              }
            }}
            label="Seleccionar Colección"
          />
        )}

        {/* Content Picker */}
        {data.hero.secondaryCtaLinkType === 'content' && (
          <SingleContentSelector
            selectedContentPath={data.hero.secondaryCtaLink}
            onSelect={(path) => {
              setNestedData('hero.secondaryCtaLink', path || '');
            }}
            label={t('editor.controls.common.selectContent')}
          />
        )}
      </div>

    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== BACKGROUND IMAGE ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Image size={14} />
          Imagen de Fondo
        </label>

        {/* Prominent Image Preview with overlaid controls */}
        <div className="relative rounded-lg overflow-hidden border border-editor-border group">
          {data.hero.imageUrl ? (
            <>
              <div className="aspect-video">
                <img src={data.hero.imageUrl} alt="Hero Background" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
              <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                <button
                  onClick={() => setShowHeroImagePicker(true)}
                  className="p-2 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-all duration-200"
                  title="Librería de Imágenes"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setShowHeroImagePicker(true)}
                  className="p-2 rounded-lg bg-editor-accent/80 backdrop-blur-md border border-editor-accent/40 text-white hover:bg-editor-accent transition-all duration-200"
                  title="Generar con IA"
                >
                  <Zap size={14} />
                </button>
                <button
                  onClick={() => setNestedData('hero.imageUrl', '')}
                  className="p-2 rounded-lg bg-red-500/60 backdrop-blur-md border border-red-500/30 text-white hover:bg-red-500/80 transition-all duration-200"
                  title="Eliminar imagen"
                >
                  <X size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center bg-editor-bg text-editor-text-secondary gap-2">
              <Image size={32} className="opacity-30" />
              <span className="text-[10px] uppercase tracking-wider opacity-50">Sin imagen</span>
            </div>
          )}
        </div>

        {showHeroImagePicker && (
          <ImagePicker
            label=""
            value={data.hero.imageUrl}
            onChange={(url) => setNestedData('hero.imageUrl', url)}
            generationContext="background"
            defaultOpen
            onClose={() => setShowHeroImagePicker(false)}
          />
        )}

        {!data.hero.imageUrl && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowHeroImagePicker(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-bg border border-editor-border text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent/30 transition-all text-xs font-medium"
            >
              <Grid size={12} /> Librería
            </button>
            <button
              onClick={() => setShowHeroImagePicker(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-accent/10 border border-editor-accent/20 text-editor-accent hover:bg-editor-accent/20 transition-all text-xs font-medium"
            >
              <Zap size={12} /> Generar IA
            </button>
          </div>
        )}

        {/* Overlay Opacity */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-editor-text-secondary">Oscurecimiento</span>
            <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{data.hero.overlayOpacity ?? 50}%</span>
          </div>
          <input
            type="range" min="0" max="100" step="5"
            value={data.hero.overlayOpacity ?? 50}
            onChange={(e) => setNestedData('hero.overlayOpacity', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-editor-text-secondary/50">Claro</span>
            <span className="text-[9px] text-editor-text-secondary/50">Oscuro</span>
          </div>
        </div>
      </div>


      {/* ========== TEXT LAYOUT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Ubicación del Texto
        </label>
        {/* Visual 3x3 position grid */}
        <div className="relative bg-editor-bg rounded-lg border border-editor-border p-3">
          {/* Preview area with position indicator */}
          <div className="relative aspect-video bg-gradient-to-br from-editor-panel-bg to-editor-bg rounded-md border border-editor-border/50 overflow-hidden mb-2">
            {/* Decorative lines representing text */}
            {(() => {
              const tl = data.hero.textLayout || 'left-top';
              const isLeft = tl.startsWith('left');
              const isRight = tl.startsWith('right');
              const isTop = tl.endsWith('-top') || tl === 'center-top';
              const isBottom = tl.endsWith('-bottom') || tl === 'center-bottom';
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
          {/* 3x3 clickable grid */}
          <div className="grid grid-cols-3 gap-1">
            {([
              { value: 'left-top',      row: 0, col: 0 },
              { value: 'center-top',    row: 0, col: 1 },
              { value: 'right-top',     row: 0, col: 2 },
              { value: 'center',        row: 1, col: 1 },
              { value: 'left-bottom',   row: 2, col: 0 },
              { value: 'center-bottom', row: 2, col: 1 },
              { value: 'right-bottom',  row: 2, col: 2 },
            ] as const).map(pos => {
              const isSelected = (data.hero.textLayout || 'left-top') === pos.value;
              const labels: Record<string, string> = {
                'left-top': 'Arriba Izquierda', 'center-top': 'Arriba Centro', 'right-top': 'Arriba Derecha',
                'center': 'Centro',
                'left-bottom': 'Abajo Izquierda', 'center-bottom': 'Abajo Centro', 'right-bottom': 'Abajo Derecha',
              };
              return (
                <button
                  key={pos.value}
                  title={labels[pos.value]}
                  onClick={() => setNestedData('hero.textLayout', pos.value)}
                  className={`flex items-center justify-center h-7 rounded transition-all duration-200 ${
                    isSelected
                      ? 'bg-editor-accent/20 border border-editor-accent/50'
                      : 'bg-editor-panel-bg/50 border border-transparent hover:bg-editor-border/50 hover:border-editor-border'
                  }`}
                  style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
                >
                  <div className={`rounded-full transition-all duration-200 ${
                    isSelected
                      ? 'w-2.5 h-2.5 bg-editor-accent shadow-[0_0_8px_var(--editor-accent)]'
                      : 'w-1.5 h-1.5 bg-editor-text-secondary/40'
                  }`} />
                </button>
              );
            })}
            {/* Empty cells for middle row left/right (no left-center or right-center options) */}
            <div className="h-7" style={{ gridRow: 2, gridColumn: 1 }} />
            <div className="h-7" style={{ gridRow: 2, gridColumn: 3 }} />
          </div>
        </div>
      </div>


      {/* ========== HERO HEIGHT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <AlignJustify size={14} />
          Altura de Sección
        </label>
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-editor-text-secondary">Altura</span>
            <span className="text-xs text-editor-text-primary font-mono">
              {data.hero.heroHeight ? `${data.hero.heroHeight}vh` : t('controls.auto')}
            </span>
          </div>
          <input
            type="range" min="0" max="100" step="5"
            value={data.hero.heroHeight ?? 0}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setNestedData('hero.heroHeight', val === 0 ? undefined : val);
            }}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
          <div className="flex justify-between">
            <span className="text-[9px] text-editor-text-secondary">{t('controls.auto')}</span>
            <span className="text-[9px] text-editor-text-secondary">100vh</span>
          </div>
        </div>
      </div>


      {/* ========== COLORS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>
        <div className="space-y-3">
          <ColorControl label={t('editor.controls.common.background')} value={data.hero.colors?.background} onChange={(v) => setNestedData('hero.colors.background', v)} />
          <ColorControl label="Primary Color" value={data.hero.colors?.primary || '#4f46e5'} onChange={(v) => setNestedData('hero.colors.primary', v)} />
          <ColorControl label="Secondary Color" value={data.hero.colors?.secondary || '#10b981'} onChange={(v) => setNestedData('hero.colors.secondary', v)} />
          <ColorControl label="Heading" value={data.hero.colors?.heading} onChange={(v) => setNestedData('hero.colors.heading', v)} />
          <ColorControl label="Text" value={data.hero.colors?.text} onChange={(v) => setNestedData('hero.colors.text', v)} />
        </div>
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <MousePointerClick size={14} />
          Button Colors
        </label>
        <div className="space-y-3">
          <ColorControl label="Primary Button BG" value={data.hero.colors?.buttonBackground} onChange={(v) => setNestedData('hero.colors.buttonBackground', v)} />
          <ColorControl label="Primary Button Text" value={data.hero.colors?.buttonText} onChange={(v) => setNestedData('hero.colors.buttonText', v)} />
          <ColorControl label="Secondary Button BG" value={data.hero.colors?.secondaryButtonBackground} onChange={(v) => setNestedData('hero.colors.secondaryButtonBackground', v)} />
          <ColorControl label="Secondary Button Text" value={data.hero.colors?.secondaryButtonText} onChange={(v) => setNestedData('hero.colors.secondaryButtonText', v)} />
        </div>

        {/* Secondary Button Style */}
        <div className="mt-4 pt-3 border-t border-editor-border/50">
          <label className="block text-xs font-medium text-editor-text-secondary mb-2">Secondary Button Style</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
            {['solid', 'outline', 'ghost'].map(style => (
              <button
                key={style}
                onClick={() => setNestedData('hero.secondaryButtonStyle', style)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.hero.secondaryButtonStyle || 'solid') === style
                  ? 'bg-editor-accent text-editor-bg'
                  : 'text-editor-text-secondary hover:bg-editor-border'
                  }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity Slider - only for solid style */}
        {(data.hero.secondaryButtonStyle || 'solid') === 'solid' && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-editor-text-secondary">Opacity</label>
              <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">{data.hero.secondaryButtonOpacity ?? 100}%</span>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={data.hero.secondaryButtonOpacity ?? 100}
              onChange={(e) => setNestedData('hero.secondaryButtonOpacity', parseInt(e.target.value))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>
        )}
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <SlidersHorizontal size={14} />
          Button Style
        </label>
        <BorderRadiusSelector label="Button Radius" value={data.hero.buttonBorderRadius || 'md'} onChange={(v) => setNestedData('hero.buttonBorderRadius', v)} />
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
