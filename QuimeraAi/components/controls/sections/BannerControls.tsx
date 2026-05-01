/**
 * BannerControls.tsx
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


export const renderBannerControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.banner) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Content */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          Content
        </label>

        <AIFormControl label={t('editor.controls.common.headline')} onAssistClick={() => setAiAssistField({ path: 'banner.headline', value: data?.banner?.headline || '', context: 'Banner Headline' })}>
          <I18nInput value={data?.banner?.headline || ''} onChange={(val) => setNestedData('banner.headline', val)} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.headlineSize')} value={data?.banner?.headlineFontSize || 'lg'} onChange={(v) => setNestedData('banner.headlineFontSize', v)} />

        <AIFormControl label={t('editor.controls.common.subheadline')} onAssistClick={() => setAiAssistField({ path: 'banner.subheadline', value: data?.banner?.subheadline || '', context: 'Banner Subheadline' })}>
          <I18nTextArea value={data?.banner?.subheadline || ''} onChange={(val) => setNestedData('banner.subheadline', val)} rows={2} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.subheadlineSize')} value={data?.banner?.subheadlineFontSize || 'md'} onChange={(v) => setNestedData('banner.subheadlineFontSize', v)} />


        <ToggleControl label={t('editor.controls.common.showButton')} checked={data?.banner?.showButton !== false} onChange={(v) => setNestedData('banner.showButton', v)} />
        {data?.banner?.showButton !== false && (
          <div className="space-y-3 animate-fade-in-up">
            <AIFormControl label={t('editor.controls.common.buttonText')} onAssistClick={() => setAiAssistField({ path: 'banner.buttonText', value: data?.banner?.buttonText || 'Get Started', context: 'Banner Button' })}>
              <I18nInput value={data?.banner?.buttonText || 'Get Started'} onChange={(val) => setNestedData('banner.buttonText', val)} />
            </AIFormControl>

            {/* Link Type Selector */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.linkType')}</label>
              <div className="flex bg-q-surface rounded-md border border-q-border p-1">
                {[
                  { value: 'manual', label: 'Manual URL' },
                  { value: 'product', label: 'Product' },
                  { value: 'collection', label: 'Collection' }
                ].map((type) => (
                  <button
                    type="button"
                    key={type.value}
                    onClick={(e) => {
                      e.preventDefault();
                      setNestedData('banner.linkType', type.value);
                    }}
                    className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data?.banner?.linkType || 'manual') === type.value
                      ? 'bg-q-accent text-q-bg'
                      : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Inputs based on Link Type */}
            {(data?.banner?.linkType === 'manual' || !data?.banner?.linkType) && (
              <I18nInput
                label={t('editor.controls.common.url')}
                value={data?.banner?.buttonUrl || '#'}
                onChange={(val) => setNestedData('banner.buttonUrl', val)}
                placeholder="https://example.com"
              />
            )}

            {data?.banner?.linkType === 'product' && (
              <SingleProductSelector
                storeId={activeProject?.id || ''}
                selectedProductId={data?.banner?.buttonUrl?.startsWith('/product/') ? data?.banner?.buttonUrl.split('/product/')[1] : undefined}
                onSelect={(id) => {
                  if (id) {
                    // Find product to get slug if needed, for now assuming ID usage or simple path
                    // Ideally we'd map ID to slug, but simple ID path works for many setups
                    // Or fetch product details. For this UI, we just store the path.
                    // Note: Real-world app likely needs slug. Here we use ID for simplicity as standard.
                    // BUT `SingleProductSelector` returns ID. Let's try to find slug from hook if accessible, 
                    // OR just use /product/[id] which is commonly supported. 
                    // Let's rely on ID for now or check if we have access to products map.
                    // We don't have easy access to products list here without hook. 
                    // So we'll save as /product/[id]. 
                    setNestedData('banner.buttonUrl', `/product/${id}`);
                    setNestedData('banner.collectionId', null); // Clear other types
                  } else {
                    setNestedData('banner.buttonUrl', '');
                  }
                }}
                label={t('editor.controls.common.selectProduct')}
              />
            )}

            {data?.banner?.linkType === 'collection' && (
              <SingleCollectionSelector
                storeId={activeProject?.id || ''}
                gridCategories={data.categoryGrid?.categories || []}
                selectedCollectionId={data?.banner?.collectionId}
                onSelect={(id) => {
                  setNestedData('banner.collectionId', id || null);
                  if (id) {
                    // Optionally clear buttonUrl or set it to collection path if your handling needs it
                    // Banner component prioritizes buttonUrl usually, so let's clear it or set it to collection path
                    // CollectionBanner logic: if (buttonUrl) window.location.href = buttonUrl; else if (collectionId) onCollectionClick
                    // So for collectionId to work, buttonUrl should probably be empty or we set buttonUrl to collection path.
                    // Let's clear buttonUrl to let CollectionBanner use collectionId logic or set a proper path:
                    setNestedData('banner.buttonUrl', '');
                  }
                }}
                label={t('editor.controls.common.selectCollection')}
              />
            )}
          </div>
        )}
      </div>

      {/* Background Image */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Image size={14} />
          Background Image
        </label>
        <ImagePicker
          label={t('editor.controls.common.backgroundImage')}
          value={data?.banner?.backgroundImageUrl || ''}
          onChange={(url) => setNestedData('banner.backgroundImageUrl', url)}
          generationContext="background"
        />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="banner" data={data} setNestedData={setNestedData} />
      {/* Layout & Size */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Layout & Size
        </label>

        <div className="mb-4">
          <SliderControl
            label={t('controls.bannerHeight')}
            value={data?.banner?.height || 400}
            onChange={(v) => setNestedData('banner.height', v)}
            min={200} max={800} step={50} suffix="px"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-q-text-secondary mb-2 uppercase tracking-wider">{t('controls.textAlignment')}</label>
          <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                type="button"
                key={align}
                onClick={(e) => {
                  e.preventDefault();
                  setNestedData('banner.textAlignment', align);
                }}
                className={`flex-1 py-2 text-xs font-medium rounded-sm transition-colors capitalize ${(data?.banner?.textAlignment || 'center') === align
                  ? 'bg-q-accent text-q-bg'
                  : 'text-q-text-secondary hover:text-q-text-primary'
                  }`}
              >
                {align}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <PaddingSelector label={t('controls.verticalPadding')} value={data?.banner?.paddingY || 'md'} onChange={(v) => setNestedData('banner.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontalPadding')} value={data?.banner?.paddingX || 'md'} onChange={(v) => setNestedData('banner.paddingX', v)} />
        </div>
      </div>

      {/* Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>

        <ColorControl label={t('controls.backgroundColor')} value={data?.banner?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('banner.colors.background', v)} />

        <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">Overlay</h5>
        <ToggleControl label={t('editor.controls.common.enableOverlay')} checked={data?.banner?.overlayEnabled !== false} onChange={(v) => setNestedData('banner.overlayEnabled', v)} />

        {data?.banner?.overlayEnabled !== false && (
          <div className="space-y-3 animate-fade-in-up mt-3">
            <ColorControl label={t('editor.controls.common.overlayColor')} value={data?.banner?.colors?.overlayColor || '#000000'} onChange={(v) => setNestedData('banner.colors.overlayColor', v)} />

              <SliderControl
                label={t('controls.overlayOpacity')}
                value={data?.banner?.backgroundOverlayOpacity ?? 50}
                onChange={(v) => setNestedData('banner.backgroundOverlayOpacity', v)}
                min={0} max={100} step={5} suffix="%"
              />
          </div>
        )}

        {/* Background Position */}
        {data?.banner?.backgroundImageUrl && (
          <PositionGridControl
            label={t('editor.controls.common.bgPosition', 'Posición de Enfoque')}
            value={data?.banner?.backgroundPosition || 'center center'}
            onChange={(val) => setNestedData('banner.backgroundPosition', val)}
          />
        )}

        <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">Text</h5>
        <ColorControl label={t('controls.headlineColor')} value={data?.banner?.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('banner.colors.heading', v)} />
        <ColorControl label={t('controls.subheadlineColor')} value={data?.banner?.colors?.text || '#ffffff'} onChange={(v) => setNestedData('banner.colors.text', v)} />

        {data?.banner?.showButton !== false && (
          <>
            <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">Button</h5>
            <ColorControl label={t('controls.fondoBotn')} value={data?.banner?.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('banner.colors.buttonBackground', v)} />
            <ColorControl label={t('editor.controls.common.buttonText')} value={data?.banner?.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('banner.colors.buttonText', v)} />
          </>
        )}
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
