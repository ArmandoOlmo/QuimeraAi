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
import {
  Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector, SliderControl
} from '../../ui/EditorControlPrimitives';
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
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.hero) return null;

  return (
    <div className="space-y-4">
      {/* ========== TEXT LAYOUT ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Ubicación del Texto
        </label>
        {/* Visual 3x3 position grid */}
        <div className="relative bg-q-bg rounded-lg border border-q-border p-3">
          {/* Preview area with position indicator */}
          <div className="relative aspect-video bg-gradient-to-br from-editor-panel-bg to-editor-bg rounded-md border border-q-border/50 overflow-hidden mb-2">
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
                <button type="button"                   key={pos.value}
                  title={labels[pos.value]}
                  onClick={() => setNestedData('hero.textLayout', pos.value)}
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
            {/* Empty cells for middle row left/right (no left-center or right-center options) */}
            <div className="h-7" style={{ gridRow: 2, gridColumn: 1 }} />
            <div className="h-7" style={{ gridRow: 2, gridColumn: 3 }} />
          </div>
        </div>
      </div>


      {/* ========== BACKGROUND IMAGE ========== */}
      <BackgroundImageControl 
        sectionKey="hero" 
        data={data.hero || {}} 
        setNestedData={setNestedData} 
        onUpload={(file) => uploadImageAndGetURL(file)} 
      />


      {/* ========== HERO HEIGHT ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <AlignJustify size={14} />
          {t('controls.heroHeight')}
        </label>
        <div className="bg-q-bg/50 p-3 rounded-lg">
          <SliderControl
            label={t('controls.sectionHeight')}
            value={data.hero.heroHeight ?? 0}
            onChange={(v) => setNestedData('hero.heroHeight', v === 0 ? undefined : v)}
            min={0}
            max={100}
            step={5}
            suffix="vh"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-q-text-secondary/50">{t('controls.auto')}</span>
            <span className="text-[9px] text-q-text-secondary/50">100vh</span>
          </div>
        </div>
      </div>


      {/* ========== CONTENT ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('controls.content')}
        </label>

        <AIFormControl label={t('editor.controls.hero.headline')} onAssistClick={() => setAiAssistField({ path: 'hero.headline', value: data.hero.headline, context: 'Hero Headline' })}>
          <TextArea value={data.hero.headline} onChange={(val) => setNestedData('hero.headline', val)} rows={2} />
        </AIFormControl>
        <FontSizeSelector label={`${t('editor.controls.hero.headline')} ${t('editor.controls.common.size', { defaultValue: 'Size' })}`} value={data.hero.headlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.headlineFontSize', v)} />

        <AIFormControl label={t('editor.controls.hero.subheadline')} onAssistClick={() => setAiAssistField({ path: 'hero.subheadline', value: data.hero.subheadline, context: 'Hero Subheadline' })}>
          <TextArea value={data.hero.subheadline} onChange={(val) => setNestedData('hero.subheadline', val)} rows={3} />
        </AIFormControl>
        <FontSizeSelector label={`${t('editor.controls.hero.subheadline')} ${t('editor.controls.common.size', { defaultValue: 'Size' })}`} value={data.hero.subheadlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.subheadlineFontSize', v)} />

        <div className="grid grid-cols-2 gap-4">
          <Input label={t('editor.controls.hero.primaryCta')} value={data.hero.primaryCta} onChange={(val) => setNestedData('hero.primaryCta', val)} />
          <Input label={t('editor.controls.hero.secondaryCta')} value={data.hero.secondaryCta} onChange={(val) => setNestedData('hero.secondaryCta', val)} />
        </div>
      </div>


      {/* ========== COLORS ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Settings size={14} />
          {t('editor.controls.common.colors')}
        </label>

        <div className="space-y-3">
          <ColorControl label={t('editor.controls.common.background')} value={data.hero.colors?.background} onChange={(v) => setNestedData('hero.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.hero.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('hero.colors.heading', v)} />
          <ColorControl label={t('editor.controls.common.text')} value={data.hero.colors?.text} onChange={(v) => setNestedData('hero.colors.text', v)} />
          <ColorControl label={t('editor.controls.common.accent', { defaultValue: 'Primary Accent' })} value={data.hero.colors?.primary} onChange={(v) => setNestedData('hero.colors.primary', v)} />

          <div className="pt-2">
            <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.primaryButton')}</h5>
            <div className="space-y-1">
              <ColorControl label={t('editor.background')} value={data.hero.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('hero.colors.buttonBackground', v)} />
              <ColorControl label={t('editor.text')} value={data.hero.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('hero.colors.buttonText', v)} />
            </div>
          </div>

          <div className="pt-2">
            <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.secondaryButton')}</h5>

            {/* Button Style Selector */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-q-text-secondary mb-1">{t('editor.controls.common.style')}</label>
              <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
                {['solid', 'outline', 'ghost'].map(style => (
                  <button type="button"                     key={style}
                    onClick={() => setNestedData('hero.secondaryButtonStyle', style)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.hero.secondaryButtonStyle || 'solid') === style
                      ? 'bg-q-accent text-q-bg'
                      : 'text-q-text-secondary hover:bg-q-surface-overlay'
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
                <SliderControl
                  label={t('controls.opacity')}
                  value={data.hero.secondaryButtonOpacity ?? 100}
                  onChange={(v) => setNestedData('hero.secondaryButtonOpacity', v)}
                  min={0}
                  max={100}
                  step={5}
                  suffix="%"
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
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.hero) return null;
  // Hero variant selector removed — only one hero style exists

  const contentTab = (
    <div className="space-y-4">
      {/* Content */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('controls.content')}
        </label>

        <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: 'hero.headline', value: data.hero.headline, context: 'Hero Headline' })}>
          <TextArea value={data.hero.headline} onChange={(val) => setNestedData('hero.headline', val)} rows={2} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.headlineSize')} value={data.hero.headlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.headlineFontSize', v)} />

        <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: 'hero.subheadline', value: data.hero.subheadline, context: 'Hero Subheadline' })}>
          <TextArea value={data.hero.subheadline} onChange={(val) => setNestedData('hero.subheadline', val)} rows={3} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.subheadlineSize')} value={data.hero.subheadlineFontSize || 'lg'} onChange={(v) => setNestedData('hero.subheadlineFontSize', v)} />

        <div className="grid grid-cols-2 gap-4">
          <Input label={t('controls.primaryCTA')} value={data.hero.primaryCta} onChange={(val) => setNestedData('hero.primaryCta', val)} />
          <Input label={t('controls.secondaryCTA')} value={data.hero.secondaryCta} onChange={(val) => setNestedData('hero.secondaryCta', val)} />
        </div>
      </div>

      {/* Logo / Headline Image — optional override */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image size={14} />
          Logo / Imagen del Título (opcional)
        </label>
        <p className="text-xs text-q-text-secondary mb-3">Si subes una imagen, se mostrará en lugar del texto del título.</p>
        <ImagePicker
          label={t('controls.logoDelTtulo')}
          value={data.hero.headlineImageUrl || ''}
          onChange={(url) => setNestedData('hero.headlineImageUrl', url)}
        />
        {data.hero.headlineImageUrl && (
          <button type="button"             onClick={() => setNestedData('hero.headlineImageUrl', '')}
            className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
          >
            Quitar imagen y usar texto
          </button>
        )}
      </div>

      {/* Primary CTA Link */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Link size={14} />
          Enlace Botón Principal
        </label>

        {/* Link Type Selector */}
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border mb-3">
          {[
            { value: 'section', label: 'Sección' },
            { value: 'product', label: 'Producto' },
            { value: 'collection', label: 'Colección' },
            { value: 'content', label: 'Contenido' },
            { value: 'manual', label: 'URL' },
          ].map(type => (
            <button type="button"               key={type.value}
              onClick={() => {
                setNestedData('hero.primaryCtaLinkType', type.value);
                if (type.value === 'section') {
                  setNestedData('hero.primaryCtaLink', '#cta');
                } else if (type.value !== 'manual') {
                  setNestedData('hero.primaryCtaLink', '');
                }
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${(data.hero.primaryCtaLinkType || 'section') === type.value
                ? 'bg-q-accent text-q-bg'
                : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
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
            onChange={(val) => setNestedData('hero.primaryCtaLink', val)}
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
            label={t('controls.seleccionarColeccin')}
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
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Link size={14} />
          Enlace Botón Secundario
        </label>

        {/* Link Type Selector */}
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border mb-3">
          {[
            { value: 'section', label: 'Sección' },
            { value: 'product', label: 'Producto' },
            { value: 'collection', label: 'Colección' },
            { value: 'content', label: 'Contenido' },
            { value: 'manual', label: 'URL' },
          ].map(type => (
            <button type="button"               key={type.value}
              onClick={() => {
                setNestedData('hero.secondaryCtaLinkType', type.value);
                if (type.value === 'section') {
                  setNestedData('hero.secondaryCtaLink', '#features');
                } else if (type.value !== 'manual') {
                  setNestedData('hero.secondaryCtaLink', '');
                }
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors ${(data.hero.secondaryCtaLinkType || 'section') === type.value
                ? 'bg-q-accent text-q-bg'
                : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
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
            onChange={(val) => setNestedData('hero.secondaryCtaLink', val)}
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
            label={t('controls.seleccionarColeccin')}
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
    <div className="space-y-4">      {/* ========== BACKGROUND IMAGE ========== */}
      <BackgroundImageControl 
        sectionKey="hero" 
        data={data.hero || {}} 
        setNestedData={setNestedData} 
        onUpload={(file) => uploadImageAndGetURL(file)} 
      />


      {/* ========== TEXT LAYOUT ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Ubicación del Texto
        </label>
        {/* Visual 3x3 position grid */}
        <div className="relative bg-q-bg rounded-lg border border-q-border p-3">
          {/* Preview area with position indicator */}
          <div className="relative aspect-video bg-gradient-to-br from-editor-panel-bg to-editor-bg rounded-md border border-q-border/50 overflow-hidden mb-2">
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
                <button type="button"                   key={pos.value}
                  title={labels[pos.value]}
                  onClick={() => setNestedData('hero.textLayout', pos.value)}
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
            {/* Empty cells for middle row left/right (no left-center or right-center options) */}
            <div className="h-7" style={{ gridRow: 2, gridColumn: 1 }} />
            <div className="h-7" style={{ gridRow: 2, gridColumn: 3 }} />
          </div>
        </div>
      </div>


      {/* ========== HERO HEIGHT ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <AlignJustify size={14} />
          Altura de Sección
        </label>
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
          <SliderControl
            label="Altura"
            value={data.hero.heroHeight ?? 0}
            onChange={(v) => setNestedData('hero.heroHeight', v === 0 ? undefined : v)}
            min={0}
            max={100}
            step={5}
            suffix="vh"
          />
          <div className="flex justify-between">
            <span className="text-[9px] text-q-text-secondary">{t('controls.auto')}</span>
            <span className="text-[9px] text-q-text-secondary">100vh</span>
          </div>
        </div>
      </div>


      {/* ========== COLORS ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>
        <div className="space-y-3">
          <ColorControl label={t('editor.controls.common.background')} value={data.hero.colors?.background} onChange={(v) => setNestedData('hero.colors.background', v)} />
          <ColorControl label={t('controls.primaryColor')} value={data.hero.colors?.primary || '#4f46e5'} onChange={(v) => setNestedData('hero.colors.primary', v)} />
          <ColorControl label={t('controls.secondaryColor')} value={data.hero.colors?.secondary || '#10b981'} onChange={(v) => setNestedData('hero.colors.secondary', v)} />
          <ColorControl label={t('controls.heading')} value={data.hero.colors?.heading} onChange={(v) => setNestedData('hero.colors.heading', v)} />
          <ColorControl label={t('controls.text')} value={data.hero.colors?.text} onChange={(v) => setNestedData('hero.colors.text', v)} />
        </div>
      </div>

      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <MousePointerClick size={14} />
          Button Colors
        </label>
        <div className="space-y-3">
          <ColorControl label={t('controls.primaryButtonBg')} value={data.hero.colors?.buttonBackground} onChange={(v) => setNestedData('hero.colors.buttonBackground', v)} />
          <ColorControl label={t('controls.primaryButtonText')} value={data.hero.colors?.buttonText} onChange={(v) => setNestedData('hero.colors.buttonText', v)} />
          <ColorControl label={t('controls.secondaryButtonBg')} value={data.hero.colors?.secondaryButtonBackground} onChange={(v) => setNestedData('hero.colors.secondaryButtonBackground', v)} />
          <ColorControl label={t('controls.secondaryButtonText')} value={data.hero.colors?.secondaryButtonText} onChange={(v) => setNestedData('hero.colors.secondaryButtonText', v)} />
        </div>

        {/* Secondary Button Style */}
        <div className="mt-4 pt-3 border-t border-q-border/50">
          <label className="block text-xs font-medium text-q-text-secondary mb-2">{t('controls.secondaryButtonStyle')}</label>
          <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
            {['solid', 'outline', 'ghost'].map(style => (
              <button type="button"                 key={style}
                onClick={() => setNestedData('hero.secondaryButtonStyle', style)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.hero.secondaryButtonStyle || 'solid') === style
                  ? 'bg-q-accent text-q-bg'
                  : 'text-q-text-secondary hover:bg-q-surface-overlay'
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
            <SliderControl
              label={t('controls.opacity')}
              value={data.hero.secondaryButtonOpacity ?? 100}
              onChange={(v) => setNestedData('hero.secondaryButtonOpacity', v)}
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </div>
        )}
      </div>

      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <SlidersHorizontal size={14} />
          Button Style
        </label>
        <BorderRadiusSelector label={t('controls.buttonRadius')} value={data.hero.buttonBorderRadius || 'md'} onChange={(v) => setNestedData('hero.buttonBorderRadius', v)} />
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
