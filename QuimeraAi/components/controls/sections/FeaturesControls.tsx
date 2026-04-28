/**
 * FeaturesControls.tsx
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
import { Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector, SliderControl } from '../../ui/EditorControlPrimitives';
import { BackgroundImageControl, CornerGradientControl, CardGlowControl, extractVideoId, ControlsDeps } from '../ControlsShared';
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


export const renderFeaturesControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.features) return null;

  // Get current variant from data, fallback to classic
  const currentVariant = (data.features as any).featuresVariant || 'classic';

  return (
    <div className="space-y-4">
      <Input label={t('editor.controls.common.title')} value={data.features.title} onChange={(e) => setNestedData('features.title', e.target.value)} />
      <FontSizeSelector label={`${t('editor.controls.common.title')} ${t('editor.controls.common.size')}`} value={data.features.titleFontSize || 'md'} onChange={(v) => setNestedData('features.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data.features.description} onChange={(e) => setNestedData('features.description', e.target.value)} rows={2} />
      <FontSizeSelector label={`${t('editor.controls.common.description')} ${t('editor.controls.common.size')}`} value={data.features.descriptionFontSize || 'md'} onChange={(v) => setNestedData('features.descriptionFontSize', v)} />

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.sectionStyle')}</label>
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 bg-q-bg p-1 rounded-md border border-q-border">
          <button type="button"             onClick={() => setNestedData('features.featuresVariant', 'classic')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'classic' ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
          >
            {t('editor.controls.hero.classic')}
          </button>
          <button type="button"             onClick={() => setNestedData('features.featuresVariant', 'modern')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'modern' ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
          >
            {t('editor.controls.features.bento')}
          </button>
          <button type="button"             onClick={() => setNestedData('features.featuresVariant', 'bento-premium')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'bento-premium' ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
          >
            {t('editor.controls.features.premium')}
          </button>
          <button type="button"             onClick={() => setNestedData('features.featuresVariant', 'bento-overlay')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'bento-overlay' ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
          >
            B. Overlay
          </button>
          <button type="button"             onClick={() => setNestedData('features.featuresVariant', 'image-overlay')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'image-overlay' ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
          >
            {t('editor.controls.features.overlay')}
          </button>
          <button type="button"             onClick={() => setNestedData('features.featuresVariant', 'neon-glow')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'neon-glow' ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
          >
            Neon Glow
          </button>
          <button type="button"             onClick={() => setNestedData('features.featuresVariant', 'press-release')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentVariant === 'press-release' ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
          >
            Press Release
          </button>
        </div>
        <p className="text-xs text-q-text-secondary mt-2">
          {currentVariant === 'classic'
            ? t('editor.controls.features.descClassic')
            : currentVariant === 'modern'
              ? t('editor.controls.features.descBento')
              : currentVariant === 'bento-premium'
                ? t('editor.controls.features.descPremium')
                : currentVariant === 'bento-overlay'
                  ? '🎭 Bento layout con imágenes full-bleed y texto overlay'
                  : t('editor.controls.features.descOverlay')}
        </p>
      </div>

      {/* Overlay-specific controls */}
      {currentVariant === 'image-overlay' && (
        <>
          <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.overlaySettings')}</label>
          <div>
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.features.textAlignment')}</label>
            <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
              {(['left', 'center', 'right'] as const).map(align => (
                <button type="button"                   key={align}
                  onClick={() => setNestedData('features.overlayTextAlignment', align)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${(data.features as any).overlayTextAlignment === align || (!((data.features as any).overlayTextAlignment) && align === 'left') ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
                >
                  {align === 'left' ? '⬅️ Left' : align === 'center' ? '↔️ Center' : '➡️ Right'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.showSectionHeader')}</label>
            <button type="button"               onClick={() => setNestedData('features.showSectionHeader', !((data.features as any).showSectionHeader !== false))}
              className={`relative w-10 h-5 rounded-full transition-colors ${(data.features as any).showSectionHeader !== false ? 'bg-q-accent' : 'bg-q-surface-overlay'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data.features as any).showSectionHeader !== false ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </>
      )}

      {/* Bento Overlay numbering toggle */}
      {currentVariant === 'bento-overlay' && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.showNumbering')}</label>
          <button type="button"             onClick={() => setNestedData('features.showNumbering', !((data.features as any).showNumbering !== false))}
            className={`relative w-10 h-5 rounded-full transition-colors ${(data.features as any).showNumbering !== false ? 'bg-q-accent' : 'bg-q-surface-overlay'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data.features as any).showNumbering !== false ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      )}

      {/* Neon Glow Controls */}
      {currentVariant === 'neon-glow' && (
        <CardGlowControl
          enabled={data.features.cardGlow?.enabled !== false}
          color={data.features.cardGlow?.color || '#144CCD'}
          intensity={data.features.cardGlow?.intensity ?? 100}
          borderRadius={data.features.cardGlow?.borderRadius ?? 80}
          gradientStart={data.features.cardGlow?.gradientStart || '#0A0909'}
          gradientEnd={data.features.cardGlow?.gradientEnd || '#09101F'}
          onEnabledChange={(v) => setNestedData('features.cardGlow.enabled', v)}
          onColorChange={(v) => setNestedData('features.cardGlow.color', v)}
          onIntensityChange={(v) => setNestedData('features.cardGlow.intensity', v)}
          onBorderRadiusChange={(v) => setNestedData('features.cardGlow.borderRadius', v)}
          onGradientStartChange={(v) => setNestedData('features.cardGlow.gradientStart', v)}
          onGradientEndChange={(v) => setNestedData('features.cardGlow.gradientEnd', v)}
        />
      )}

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.gridLayout')}</label>
      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.features.columnsDesktop')}</label>
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
          {[2, 3, 4].map(cols => (
            <button type="button"               key={cols}
              onClick={() => setNestedData('features.gridColumns', cols)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.features.gridColumns === cols ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
            >
              {cols}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.cardImage')}</label>
      <div className="mb-3">
        <SliderControl
          label={t('editor.controls.features.imageHeight')}
          value={data.features.imageHeight || 430}
          onChange={(v) => setNestedData('features.imageHeight', v)}
          min={100} max={600} step={10} suffix="px"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.objectFit')}</label>
        <div className="grid grid-cols-3 gap-1 bg-q-bg p-1 rounded-md border border-q-border">
          {['cover', 'contain', 'fill', 'none', 'scale-down'].map(fit => (
            <button type="button"               key={fit}
              onClick={() => setNestedData('features.imageObjectFit', fit)}
              className={`py-1 px-2 text-xs font-semibold rounded-sm transition-colors capitalize ${data.features.imageObjectFit === fit ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
            >
              {fit === 'scale-down' ? 'Scale' : fit}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('editor.controls.common.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('editor.controls.common.vertical')} value={data.features.paddingY || 'md'} onChange={(v) => setNestedData('features.paddingY', v)} />
          <PaddingSelector label={t('editor.controls.common.horizontal')} value={data.features.paddingX || 'md'} onChange={(v) => setNestedData('features.paddingX', v)} />
        </div>
      </div>

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.common.colors')}</label>
      <ColorControl label={t('editor.controls.common.background')} value={data.features.colors?.background || '#000000'} onChange={(v) => setNestedData('features.colors.background', v)} />
      <ColorControl label={t('editor.controls.features.showSectionHeader')} value={data.features.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('features.colors.heading', v)} />
      <ColorControl label={t('editor.controls.common.description')} value={data.features.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('features.colors.description', v)} />
      <ColorControl label={t('editor.controls.common.accent')} value={data.features.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('features.colors.accent', v)} />

      <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold">{t('editor.controls.features.cardColors')}</p>

      <ColorControl label={`${t('editor.controls.features.cardImage')} ${t('editor.controls.common.background')}`} value={data.features.colors?.cardBackground || '#1a1a2e'} onChange={(v) => setNestedData('features.colors.cardBackground', v)} />
      <ColorControl label={`${t('editor.controls.features.cardImage')} ${t('editor.controls.common.title')}`} value={(data.features.colors as any)?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('features.colors.cardHeading', v)} />
      <ColorControl label={`${t('editor.controls.features.cardImage')} ${t('editor.controls.common.text')}`} value={(data.features.colors as any)?.cardText || '#94a3b8'} onChange={(v) => setNestedData('features.colors.cardText', v)} />
      <ColorControl label={t('editor.controls.hero.borderColor')} value={data.features.colors?.borderColor || 'transparent'} onChange={(v) => setNestedData('features.colors.borderColor', v)} />
      <div className="mb-3 mt-3">
        <SliderControl
          label="Border Thickness"
          value={data.features.cardBorderSize || 0}
          onChange={(v) => setNestedData('features.cardBorderSize', v)}
          min={0} max={20} step={1} suffix="px"
        />
      </div>
      <div className="mb-3">
        <SliderControl
          label="Border Opacity"
          value={data.features.cardBorderOpacity !== undefined ? data.features.cardBorderOpacity : 100}
          onChange={(v) => setNestedData('features.cardBorderOpacity', v)}
          min={0} max={100} step={1} suffix="%"
        />
      </div>

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.features.featureList')}</label>
      {(data.features.items || []).map((item, index) => (
        <div key={index} className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 group">
          <ImagePicker
            label={`${t('editor.controls.features.feature')} #${index + 1}`}
            value={item.imageUrl}
            onChange={(url) => setNestedData(`features.items.${index}.imageUrl`, url)}
            onRemove={() => {
              const newItems = data.features.items.filter((_, i) => i !== index);
              setNestedData('features.items', newItems);
            }}
          />
          <Input
            placeholder="Title"
            value={item.title}
            onChange={(e) => setNestedData(`features.items.${index}.title`, e.target.value)}
            className="mb-2 mt-2"
          />
          <textarea
            placeholder="Description"
            value={item.description}
            onChange={(e) => setNestedData(`features.items.${index}.description`, e.target.value)}
            rows={2}
            className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mb-2"
          />
        </div>
      ))}
      <button type="button"         onClick={() => {
          setNestedData('features.items', [...(data.features.items || []), { title: '', description: '', imageUrl: '' }]);
        }}
        className="w-full py-2 border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent hover:border-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus size={14} /> {t('editor.controls.features.addFeature')}
      </button>
    </div>
  );
};


// ─── ─── ─── ─── ─── ─── ───

export const renderFeaturesControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.features) return null;
  const currentVariant = (data.features as any).featuresVariant || 'classic';

  const contentTab = (
    <div className="space-y-4">
      {/* Title and Description */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <FileText size={14} />
          {t('editor.controls.features.sectionHeader', 'Section Header')}
        </label>
        <Input label={t('editor.controls.common.title')} value={data.features.title} onChange={(e) => setNestedData('features.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.features.titleFontSize || 'md'} onChange={(v) => setNestedData('features.titleFontSize', v)} />
        <TextArea label={t('editor.controls.common.description')} value={data.features.description} onChange={(e) => setNestedData('features.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.features.descriptionFontSize || 'md'} onChange={(v) => setNestedData('features.descriptionFontSize', v)} />
      </div>

      {/* Features Items */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <List size={14} />
          {t('editor.controls.features.featuresList', 'Features List')}
        </label>
        {(data.features.items || []).map((item, index) => (
          <div
            key={index}
            data-section-item={`features:${index}`}
            className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 group"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-q-text-secondary">Feature #{index + 1}</span>
              <button type="button"                 onClick={() => {
                  const newItems = data.features.items.filter((_, i) => i !== index);
                  setNestedData('features.items', newItems);
                }}
                className="text-q-text-secondary hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <Input placeholder="Title" value={item.title} onChange={(e) => setNestedData(`features.items.${index}.title`, e.target.value)} className="mb-2" />
            <textarea
              placeholder="Description"
              value={item.description}
              onChange={(e) => setNestedData(`features.items.${index}.description`, e.target.value)}
              rows={2}
              className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mb-2"
            />
            <ImagePicker
              label={t('editor.controls.common.image')}
              value={item.imageUrl}
              onChange={(url) => setNestedData(`features.items.${index}.imageUrl`, url)}
            />

            {/* Link Controls */}
            <div className="mt-3 pt-3 border-t border-q-border/50">
              <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.link')}</label>
              <input
                placeholder="Link Text (e.g. Learn more)"
                value={item.linkText || ''}
                onChange={(e) => setNestedData(`features.items.${index}.linkText`, e.target.value)}
                className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mb-2"
              />
              <div className="flex bg-q-surface rounded-md border border-q-border p-1 mb-2">
                {[
                  { value: 'manual', label: 'URL' },
                  { value: 'product', label: 'Product' },
                  { value: 'collection', label: 'Collection' },
                  { value: 'content', label: 'Contenido' }
                ].map((type) => (
                  <button type="button"                     key={type.value}
                    onClick={() => setNestedData(`features.items.${index}.linkType`, type.value)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(item.linkType || 'manual') === type.value
                      ? 'bg-q-accent text-q-bg'
                      : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {(item.linkType === 'manual' || !item.linkType) && (
                <>
                  <input
                    placeholder="https://example.com or #section"
                    value={item.linkUrl || ''}
                    onChange={(e) => setNestedData(`features.items.${index}.linkUrl`, e.target.value)}
                    className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent"
                  />
                  <p className="text-xs text-q-text-secondary mt-1">
                    Use URLs for external links or # for page sections
                  </p>
                </>
              )}
              {item.linkType === 'product' && (
                <SingleProductSelector
                  storeId={activeProject?.id || ''}
                  selectedProductId={item.linkUrl?.startsWith('/product/') ? item.linkUrl.split('/product/')[1] : undefined}
                  onSelect={(id) => {
                    if (id) {
                      setNestedData(`features.items.${index}.linkUrl`, `/product/${id}`);
                    } else {
                      setNestedData(`features.items.${index}.linkUrl`, '');
                    }
                  }}
                  label={t('editor.controls.common.selectProduct')}
                />
              )}
              {item.linkType === 'collection' && (
                <SingleCollectionSelector
                  storeId={activeProject?.id || ''}
                  gridCategories={data.categoryGrid?.categories || []}
                  selectedCollectionId={(item as any).collectionId}
                  onSelect={(id) => {
                    setNestedData(`features.items.${index}.collectionId`, id || null);
                    if (id) {
                      setNestedData(`features.items.${index}.linkUrl`, '');
                    }
                  }}
                  label={t('editor.controls.common.selectCollection')}
                />
              )}
              {item.linkType === 'content' && (
                <SingleContentSelector
                  selectedContentPath={item.linkUrl}
                  onSelect={(path) => {
                    setNestedData(`features.items.${index}.linkUrl`, path || '');
                  }}
                  label={t('editor.controls.common.selectContent')}
                />
              )}
            </div>
          </div>
        ))}
        <button type="button"           onClick={() => {
            setNestedData('features.items', [...(data.features.items || []), { title: '', description: '', imageUrl: '' }]);
          }}
          className="w-full py-2 border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent hover:border-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> Add Feature
        </button>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="features" data={data} setNestedData={setNestedData} />
      {/* Section Style */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          {t('editor.controls.features.sectionStyle')}
        </label>
        <div className="mb-4">
          <Select
            label={t('editor.controls.features.styleVariant')}
            value={currentVariant}
            onChange={(v) => {
              setNestedData('features.featuresVariant', v);
              if (v === 'image-overlay') {
                setNestedData('features.gridColumns', 4);
              }
            }}
            options={[
              { value: 'classic', label: 'Classic (Grid Uniforme)' },
              { value: 'modern', label: 'Modern (Bento Asimétrico)' },
              { value: 'bento-premium', label: 'Premium (Bento Destacado)' },
              { value: 'bento-overlay', label: 'Bento Overlay (Imágenes + Texto)' },
              { value: 'image-overlay', label: 'Overlay (Tarjetas Completas)' },
              { value: 'neon-glow', label: 'Neon Glow (Resplandor Interior)' },
              { value: 'press-release', label: 'Press Release (Curvas Dinámicas)' }
            ]}
          />
          <p className="text-xs text-q-text-secondary mt-2">
            {currentVariant === 'classic'
              ? t('editor.controls.features.descClassic', '📦 Layout de cuadrícula tradicional')
              : currentVariant === 'modern'
                ? t('editor.controls.features.descBento', '✨ Layout moderno bento asimétrico')
                : currentVariant === 'bento-premium'
                  ? t('editor.controls.features.descPremium', '🎯 Bento premium con primera tarjeta destacada')
                  : currentVariant === 'bento-overlay'
                    ? '🎭 Bento layout con imágenes full-bleed y texto overlay'
                    : currentVariant === 'press-release'
                      ? '📰 Tarjetas de prensa con bordes curvos dinámicos'
                      : t('editor.controls.features.descOverlay', '🖼️ Imágenes completas con texto superpuesto')}
          </p>
        </div>

        {currentVariant === 'cinematic-gym' && (
          <div className="mb-4">
            <Select
              label={t('controls.alineacinDelLayout')}
              value={(data.features as any)?.layoutAlignment || 'left'}
              onChange={(v) => setNestedData('features.layoutAlignment', v)}
              options={[
                { value: 'left', label: 'Texto a la Izquierda, Tarjetas a la Derecha' },
                { value: 'right', label: 'Texto a la Derecha, Tarjetas a la Izquierda' }
              ]}
            />
          </div>
        )}

        {/* Neon Glow Controls */}
        {currentVariant === 'neon-glow' && (
          <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
            <CardGlowControl
              enabled={data.features.cardGlow?.enabled !== false}
              color={data.features.cardGlow?.color || '#144CCD'}
              intensity={data.features.cardGlow?.intensity ?? 100}
              borderRadius={data.features.cardGlow?.borderRadius ?? 80}
              gradientStart={data.features.cardGlow?.gradientStart || '#0A0909'}
              gradientEnd={data.features.cardGlow?.gradientEnd || '#09101F'}
              onEnabledChange={(v) => setNestedData('features.cardGlow.enabled', v)}
              onColorChange={(v) => setNestedData('features.cardGlow.color', v)}
              onIntensityChange={(v) => setNestedData('features.cardGlow.intensity', v)}
              onBorderRadiusChange={(v) => setNestedData('features.cardGlow.borderRadius', v)}
              onGradientStartChange={(v) => setNestedData('features.cardGlow.gradientStart', v)}
              onGradientEndChange={(v) => setNestedData('features.cardGlow.gradientEnd', v)}
            />
          </div>
        )}

        {/* Overlay Settings - only shown when image-overlay variant is selected */}
        {currentVariant === 'image-overlay' && (
          <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
            <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
              <Image size={14} />
              Overlay Settings
            </label>
            <div>
              <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.textAlignment')}</label>
              <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button type="button"                     key={align}
                    onClick={() => setNestedData('features.overlayTextAlignment', align)}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${(data.features as any).overlayTextAlignment === align || (!((data.features as any).overlayTextAlignment) && align === 'left') ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
                  >
                    {align === 'left' ? '⬅️ Left' : align === 'center' ? '↔️ Center' : '➡️ Right'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.showSectionHeader')}</label>
              <button type="button"                 onClick={() => setNestedData('features.showSectionHeader', !((data.features as any).showSectionHeader !== false))}
                className={`relative w-10 h-5 rounded-full transition-colors ${(data.features as any).showSectionHeader !== false ? 'bg-q-accent' : 'bg-q-surface-overlay'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data.features as any).showSectionHeader !== false ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        )}

        {/* Bento Overlay Settings */}
        {currentVariant === 'bento-overlay' && (
          <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
            <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
              <Layers size={14} />
              Bento Overlay Settings
            </label>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.showNumbering')}</label>
              <button type="button"                 onClick={() => setNestedData('features.showNumbering', !((data.features as any).showNumbering !== false))}
                className={`relative w-10 h-5 rounded-full transition-colors ${(data.features as any).showNumbering !== false ? 'bg-q-accent' : 'bg-q-surface-overlay'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data.features as any).showNumbering !== false ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid Layout */}
      {currentVariant !== 'cinematic-gym' && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
          <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
            <Grid size={14} />
            Grid Layout
          </label>
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.columnsDesktop')}</label>
          <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
            {[2, 3, 4].map(cols => (
              <button type="button"                 key={cols}
                onClick={() => setNestedData('features.gridColumns', cols)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.features.gridColumns === cols ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
              >
                {cols}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card Image */}
      {currentVariant !== 'modern' && currentVariant !== 'bento-premium' && currentVariant !== 'cinematic-gym' && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
          <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
            <Image size={14} />
            {t('editor.controls.features.cardImage', 'Card Image')}
          </label>
          <div className="mb-3">
            <SliderControl
              label={t('editor.controls.features.imageHeight', 'Image Height')}
              value={data.features.imageHeight || 430}
              onChange={(v) => setNestedData('features.imageHeight', v)}
              min={100} max={600} step={10} suffix="px"
            />
          </div>
        {currentVariant !== 'cinematic-gym' && (
          <div>
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.objectFit')}</label>
            <div className="grid grid-cols-3 gap-1 bg-q-bg p-1 rounded-md border border-q-border">
              {['cover', 'contain', 'fill', 'none', 'scale-down'].map(fit => (
                <button type="button"                   key={fit}
                  onClick={() => setNestedData('features.imageObjectFit', fit)}
                  className={`py-1 px-2 text-xs font-semibold rounded-sm transition-colors capitalize ${data.features.imageObjectFit === fit ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
                >
                  {fit === 'scale-down' ? 'Scale' : fit}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
     )}

      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Settings size={14} />
          Spacing
        </label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data.features.paddingY || 'md'} onChange={(v) => setNestedData('features.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data.features.paddingX || 'md'} onChange={(v) => setNestedData('features.paddingX', v)} />
        </div>
      </div>

      {/* Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>
        <ColorControl label={t('editor.controls.common.background')} value={data.features.colors?.background || '#000000'} onChange={(v) => setNestedData('features.colors.background', v)} />
        <ColorControl label={t('controls.sectionTitle')} value={data.features.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('features.colors.heading', v)} />
        <ColorControl label={t('controls.sectionDescription')} value={data.features.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('features.colors.description', v)} />
        <ColorControl label={t('controls.accent')} value={data.features.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('features.colors.accent', v)} />

        <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold">Card Colors</p>

        <ColorControl label={t('controls.cardBackground')} value={data.features.colors?.cardBackground || '#1a1a2e'} onChange={(v) => setNestedData('features.colors.cardBackground', v)} />
        <ColorControl label={t('controls.cardTitle')} value={data.features.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('features.colors.cardHeading', v)} />
        <ColorControl label={t('controls.cardText')} value={data.features.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('features.colors.cardText', v)} />
        <ColorControl label={t('controls.border')} value={data.features.colors?.borderColor || 'transparent'} onChange={(v) => setNestedData('features.colors.borderColor', v)} />
        <div className="mt-3">
          <SliderControl
            label="Border Thickness"
            value={data.features.cardBorderSize || 0}
            onChange={(v) => setNestedData('features.cardBorderSize', v)}
            min={0} max={20} step={1} suffix="px"
          />
        </div>
        <div className="mt-3">
          <SliderControl
            label="Border Opacity"
            value={data.features.cardBorderOpacity !== undefined ? data.features.cardBorderOpacity : 100}
            onChange={(v) => setNestedData('features.cardBorderOpacity', v)}
            min={0} max={100} step={1} suffix="%"
          />
        </div>
      </div>

      {/* Animations */}
      <AnimationControls
        animationType={data.features.animationType || 'fade-in-up'}
        enableCardAnimation={data.features.enableCardAnimation !== false}
        onChangeAnimationType={(type) => setNestedData('features.animationType', type)}
        onToggleAnimation={(enabled) => setNestedData('features.enableCardAnimation', enabled)}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
