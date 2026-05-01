/**
 * HeroSplitControls.tsx
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


export const renderHeroSplitControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.heroSplit) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Content Section */}
      <div>
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('controls.content')}
        </label>

        <AIFormControl label={t('controls.headline')} onAssistClick={() => setAiAssistField({ path: 'heroSplit.headline', value: data.heroSplit.headline, context: 'Hero Split Headline' })}>
          <TextArea value={data.heroSplit.headline} onChange={(val) => setNestedData('heroSplit.headline', val)} rows={2} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.headlineSize')} value={data.heroSplit.headlineFontSize || 'lg'} onChange={(v) => setNestedData('heroSplit.headlineFontSize', v)} />

        <AIFormControl label={t('controls.subheadline')} onAssistClick={() => setAiAssistField({ path: 'heroSplit.subheadline', value: data.heroSplit.subheadline, context: 'Hero Split Description' })}>
          <TextArea value={data.heroSplit.subheadline} onChange={(val) => setNestedData('heroSplit.subheadline', val)} rows={3} />
        </AIFormControl>
        <FontSizeSelector label={t('controls.subheadlineSize')} value={data.heroSplit.subheadlineFontSize || 'md'} onChange={(v) => setNestedData('heroSplit.subheadlineFontSize', v)} />

        <Input label={t('editor.controls.common.buttonText')} value={data.heroSplit.buttonText} onChange={(val) => setNestedData('heroSplit.buttonText', val)} />

        {/* Link Type Selector */}
        <div className="mb-3">
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.linkType')}</label>
          <div className="flex bg-q-surface rounded-md border border-q-border p-1">
            {[
              { value: 'manual', label: 'Manual URL' },
              { value: 'product', label: 'Product' },
              { value: 'collection', label: 'Collection' },
              { value: 'content', label: 'Contenido' }
            ].map((type) => (
              <button type="button"                 key={type.value}
                onClick={() => setNestedData('heroSplit.linkType', type.value)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data.heroSplit.linkType || 'manual') === type.value
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
        {(data.heroSplit.linkType === 'manual' || !data.heroSplit.linkType) && (
          <Input label={t('editor.controls.common.url')} value={data.heroSplit.buttonUrl || '#cta'} onChange={(val) => setNestedData('heroSplit.buttonUrl', val)} />
        )}

        {data.heroSplit.linkType === 'product' && (
          <SingleProductSelector
            storeId={activeProject?.id || ''}
            selectedProductId={data.heroSplit.buttonUrl?.startsWith('/product/') ? data.heroSplit.buttonUrl.split('/product/')[1] : undefined}
            onSelect={(id) => {
              if (id) {
                setNestedData('heroSplit.buttonUrl', `/product/${id}`);
              } else {
                setNestedData('heroSplit.buttonUrl', '');
              }
            }}
            label={t('editor.controls.common.selectProduct')}
          />
        )}

        {data.heroSplit.linkType === 'collection' && (
          <SingleCollectionSelector
            storeId={activeProject?.id || ''}
            gridCategories={data.categoryGrid?.categories || []}
            selectedCollectionId={data.heroSplit.collectionId}
            onSelect={(id) => {
              setNestedData('heroSplit.collectionId', id || null);
              if (id) {
                // For heroSplit, we'll likely want to use the buttonUrl for navigation, 
                // but if it supports collectionId internally like Banner, we clear buttonUrl.
                // Assuming standardization: 
                setNestedData('heroSplit.buttonUrl', '');
              }
            }}
            label={t('editor.controls.common.selectCollection')}
          />
        )}
      </div>


      {/* Image */}
      <div>
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image size={14} />
          Image
        </label>
        <ImagePicker label={t('editor.controls.hero.image')} value={data.heroSplit.imageUrl} onChange={(url) => setNestedData('heroSplit.imageUrl', url)} />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="heroSplit" data={data} setNestedData={setNestedData} />
      {/* Layout */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Layout
        </label>

        {/* Image Position Toggle */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-q-text-secondary mb-2">{t('controls.imagePosition')}</label>
          <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
            {['left', 'right'].map(pos => (
              <button type="button"                 key={pos}
                onClick={() => setNestedData('heroSplit.imagePosition', pos)}
                className={`flex-1 py-2 text-sm font-medium rounded-sm capitalize ${data.heroSplit.imagePosition === pos
                  ? 'bg-q-accent text-q-bg'
                  : 'text-q-text-secondary hover:bg-q-surface-overlay'
                  }`}
              >
                {pos === 'left' ? '← Image Left' : 'Image Right →'}
              </button>
            ))}
          </div>
          <p className="text-xs text-q-text-secondary mt-1 italic">
            Switch between image on left or right side
          </p>
        </div>

        {/* Max Height */}
        <div className="mb-4">
          <SliderControl
            label={t('controls.maxHeight')}
            value={data.heroSplit.maxHeight || 500}
            onChange={(v) => setNestedData('heroSplit.maxHeight', v)}
            min={300} max={800} step={50} suffix="px"
          />
        </div>

        {/* Angle Intensity */}
        <div>
          <SliderControl
            label={t('controls.angleIntensity')}
            value={data.heroSplit.angleIntensity || 15}
            onChange={(v) => setNestedData('heroSplit.angleIntensity', v)}
            min={0} max={30} step={5} suffix="%"
          />
          <p className="text-xs text-q-text-secondary mt-1 italic">
            0 = straight line, higher = more diagonal
          </p>
        </div>
      </div>


      {/* Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>

        <div className="space-y-3">
          <ColorControl label={t('controls.textSideBackground')} value={data.heroSplit.colors?.textBackground || '#ffffff'} onChange={(v) => setNestedData('heroSplit.colors.textBackground', v)} />
          <ColorControl label={t('controls.imageSideBackground')} value={data.heroSplit.colors?.imageBackground || '#000000'} onChange={(v) => setNestedData('heroSplit.colors.imageBackground', v)} />


          <ColorControl label={t('controls.headlineColor')} value={data.heroSplit.colors?.heading || '#111827'} onChange={(v) => setNestedData('heroSplit.colors.heading', v)} />
          <ColorControl label={t('controls.textColor')} value={data.heroSplit.colors?.text || '#4b5563'} onChange={(v) => setNestedData('heroSplit.colors.text', v)} />

          <p className="text-[10px] text-q-text-secondary uppercase tracking-wider font-bold">Button</p>

          <ColorControl label={t('controls.fondoBotn')} value={data.heroSplit.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('heroSplit.colors.buttonBackground', v)} />
          <ColorControl label={t('editor.controls.common.buttonText')} value={data.heroSplit.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('heroSplit.colors.buttonText', v)} />

          <BorderRadiusSelector label={t('controls.buttonCorners')} value={data.heroSplit.buttonBorderRadius || 'xl'} onChange={(v) => setNestedData('heroSplit.buttonBorderRadius', v)} />


          {/* Corner Gradient */}
          <CornerGradientControl
            enabled={data.heroSplit.cornerGradient?.enabled || false}
            position={data.heroSplit.cornerGradient?.position || 'top-left'}
            color={data.heroSplit.cornerGradient?.color || '#4f46e5'}
            opacity={data.heroSplit.cornerGradient?.opacity || 30}
            size={data.heroSplit.cornerGradient?.size || 50}
            onEnabledChange={(v) => setNestedData('heroSplit.cornerGradient.enabled', v)}
            onPositionChange={(v) => setNestedData('heroSplit.cornerGradient.position', v)}
            onColorChange={(v) => setNestedData('heroSplit.cornerGradient.color', v)}
            onOpacityChange={(v) => setNestedData('heroSplit.cornerGradient.opacity', v)}
            onSizeChange={(v) => setNestedData('heroSplit.cornerGradient.size', v)}
          />
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
