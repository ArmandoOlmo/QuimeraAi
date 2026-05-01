/**
 * TestimonialsControls.tsx
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
import { Input, TextArea, I18nInput, I18nTextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector, SliderControl } from '../../ui/EditorControlPrimitives';
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


export const renderTestimonialsControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.testimonials) return null;
  return (
    <div className="space-y-4">
      <I18nInput label={t('editor.controls.common.title')} value={data.testimonials.title} onChange={(val) => setNestedData('testimonials.title', val)} />
      <FontSizeSelector label={`${t('editor.controls.common.title')} ${t('editor.controls.common.size')}`} value={data.testimonials.titleFontSize || 'md'} onChange={(v) => setNestedData('testimonials.titleFontSize', v)} />

      <I18nTextArea label={t('editor.controls.common.description')} value={data.testimonials.description} onChange={(val) => setNestedData('testimonials.description', val)} rows={2} />
      <FontSizeSelector label={`${t('editor.controls.common.description')} ${t('editor.controls.common.size')}`} value={data.testimonials.descriptionFontSize || 'md'} onChange={(v) => setNestedData('testimonials.descriptionFontSize', v)} />

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.testimonials.cardStyling')}</label>

      <div className="mb-4">
        <Select
          label={t('controls.styleVariant')}
          value={(data.testimonials as any).testimonialsVariant || 'classic'}
          onChange={(v) => setNestedData('testimonials.testimonialsVariant', v)}
          options={[
            { value: 'classic', label: 'Classic' },
            { value: 'minimal-cards', label: 'Minimal Cards' },
            { value: 'glassmorphism', label: 'Glassmorphism' },
            { value: 'gradient-glow', label: 'Gradient Glow' },
            { value: 'neon-border', label: 'Neon Border' },
            { value: 'floating-cards', label: 'Floating Cards' },
            { value: 'gradient-shift', label: 'Gradient Shift' },
            { value: 'neon-glow', label: 'Neon Glow (Resplandor Interior)' }
          ]}
        />
      </div>

      {/* Neon Glow Controls */}
      {(data.testimonials as any).testimonialsVariant === 'neon-glow' && (
        <CardGlowControl
          enabled={data.testimonials.cardGlow?.enabled !== false}
          color={data.testimonials.cardGlow?.color || '#144CCD'}
          intensity={data.testimonials.cardGlow?.intensity ?? 100}
          borderRadius={data.testimonials.cardGlow?.borderRadius ?? 80}
          gradientStart={data.testimonials.cardGlow?.gradientStart || '#0A0909'}
          gradientEnd={data.testimonials.cardGlow?.gradientEnd || '#09101F'}
          onEnabledChange={(v) => setNestedData('testimonials.cardGlow.enabled', v)}
          onColorChange={(v) => setNestedData('testimonials.cardGlow.color', v)}
          onIntensityChange={(v) => setNestedData('testimonials.cardGlow.intensity', v)}
          onBorderRadiusChange={(v) => setNestedData('testimonials.cardGlow.borderRadius', v)}
          onGradientStartChange={(v) => setNestedData('testimonials.cardGlow.gradientStart', v)}
          onGradientEndChange={(v) => setNestedData('testimonials.cardGlow.gradientEnd', v)}
        />
      )}

      <ColorControl label={t('editor.controls.testimonials.cardBackground')} value={data.testimonials.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('testimonials.colors.cardBackground', v)} />

      <BorderRadiusSelector label={t('editor.controls.testimonials.cardCorners')} value={data.testimonials.borderRadius || 'xl'} onChange={(v) => setNestedData('testimonials.borderRadius', v)} />

      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.testimonials.cardShadow')}</label>
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
          {['none', 'sm', 'md', 'lg', 'xl'].map((shadow) => (
            <button type="button"               key={shadow}
              onClick={() => setNestedData('testimonials.cardShadow', shadow)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors uppercase ${(data.testimonials.cardShadow || 'lg') === shadow ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
            >
              {shadow}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.testimonials.borderStyle')}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'none', label: t('editor.controls.testimonials.none') },
            { value: 'solid', label: t('editor.controls.testimonials.solid') },
            { value: 'gradient', label: t('editor.controls.testimonials.gradient') },
            { value: 'glow', label: t('editor.controls.testimonials.glow') }
          ].map(style => (
            <button type="button"               key={style.value}
              onClick={() => setNestedData('testimonials.borderStyle', style.value)}
              className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${(data.testimonials.borderStyle || 'solid') === style.value ? 'bg-q-accent text-q-bg' : 'bg-q-bg text-q-text-secondary hover:bg-q-surface-overlay border border-q-border'}`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <ColorControl label={t('editor.controls.testimonials.borderColor')} value={data.testimonials.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('testimonials.colors.borderColor', v)} />

      <div className="mb-4">
        <SliderControl
          label={t('controls.cardPadding')}
          value={data.testimonials.cardPadding || 32}
          onChange={(v) => setNestedData('testimonials.cardPadding', v)}
          min={16}
          max={64}
          step={4}
          suffix="px"
        />
      </div>

      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data.testimonials.paddingY || 'md'} onChange={(v) => setNestedData('testimonials.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data.testimonials.paddingX || 'md'} onChange={(v) => setNestedData('testimonials.paddingX', v)} />
        </div>
      </div>

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.sectionColors')}</label>
      <ColorControl label={t('editor.controls.common.background')} value={data.testimonials.colors?.background || '#000000'} onChange={(v) => setNestedData('testimonials.colors.background', v)} />
      <ColorControl label={t('editor.controls.common.title')} value={data.testimonials.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.heading', v)} />
      <ColorControl label={t('editor.controls.common.description')} value={data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.description', v)} />
      <ColorControl label={t('controls.text')} value={data.testimonials.colors?.text || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.text', v)} />
      <ColorControl label={t('controls.personTitle')} value={data.testimonials.colors?.subtitleColor || data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.subtitleColor', v)} />
      <ColorControl label={t('controls.accent')} value={data.testimonials.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('testimonials.colors.accent', v)} />


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data.testimonials.cornerGradient?.enabled || false}
        position={data.testimonials.cornerGradient?.position || 'top-left'}
        color={data.testimonials.cornerGradient?.color || '#4f46e5'}
        opacity={data.testimonials.cornerGradient?.opacity || 30}
        size={data.testimonials.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('testimonials.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('testimonials.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('testimonials.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('testimonials.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('testimonials.cornerGradient.size', v)}
      />

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.testimonials')}</label>
      {(data.testimonials.items || []).map((item: any, index: number) => (
        <div
          key={index}
          data-section-item={`testimonials:${index}`}
          className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 group"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-q-text-secondary">Testimonial #{index + 1}</span>
            <button type="button"               onClick={() => {
                const newItems = (data.testimonials.items || []).filter((_: any, i: number) => i !== index);
                setNestedData('testimonials.items', newItems);
              }}
              className="text-q-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <ImagePicker
            label={`Avatar #${index + 1}`}
            value={item.imageUrl || ''}
            onChange={(url) => setNestedData(`testimonials.items.${index}.imageUrl`, url)}
            onRemove={() => setNestedData(`testimonials.items.${index}.imageUrl`, '')}
          />
          <I18nTextArea
            placeholder="Quote"
            value={item.quote}
            onChange={(val) => setNestedData(`testimonials.items.${index}.quote`, val)}
            rows={2}
            className="mb-2"
          />
          <I18nInput
            placeholder="Name"
            value={item.name}
            onChange={(val) => setNestedData(`testimonials.items.${index}.name`, val)}
            className="mb-2"
          />
          <I18nInput
            placeholder="Role"
            value={item.title}
            onChange={(val) => setNestedData(`testimonials.items.${index}.title`, val)}
            className="mb-2"
          />
        </div>
      ))}
      <button type="button"         onClick={() => {
          const newItem = { quote: '', name: '', title: '', imageUrl: '' };
          setNestedData('testimonials.items', [...(data.testimonials.items || []), newItem]);
        }}
        className="w-full py-2 border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent hover:border-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus size={14} /> Add Testimonial
      </button>
    </div>
  );
}

// ─── ─── ─── ─── ─── ─── ───

export const renderTestimonialsControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.testimonials) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Title and Description */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <FileText size={14} />
          Section Header
        </label>
        <I18nInput label={t('editor.controls.common.title')} value={data.testimonials.title} onChange={(val) => setNestedData('testimonials.title', val)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.testimonials.titleFontSize || 'md'} onChange={(v) => setNestedData('testimonials.titleFontSize', v)} />
        <I18nTextArea label={t('editor.controls.common.description')} value={data.testimonials.description} onChange={(val) => setNestedData('testimonials.description', val)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.testimonials.descriptionFontSize || 'md'} onChange={(v) => setNestedData('testimonials.descriptionFontSize', v)} />
      </div>

      {/* Testimonials Items */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <MessageSquare size={14} />
          Testimonials List
        </label>
        {(data.testimonials.items || []).map((item: any, index: number) => (
          <div key={index} className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-q-text-secondary">Testimonial #{index + 1}</span>
              <button type="button"                 onClick={() => {
                  const newItems = (data.testimonials.items || []).filter((_: any, i: number) => i !== index);
                  setNestedData('testimonials.items', newItems);
                }}
                className="text-q-text-secondary hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <ImagePicker
              label={`Avatar #${index + 1}`}
              value={item.imageUrl || ''}
              onChange={(url) => setNestedData(`testimonials.items.${index}.imageUrl`, url)}
              onRemove={() => setNestedData(`testimonials.items.${index}.imageUrl`, '')}
            />
            <I18nTextArea
              placeholder="Quote"
              value={item.quote}
              onChange={(val) => setNestedData(`testimonials.items.${index}.quote`, val)}
              rows={3}
              className="mb-2"
            />
            <I18nInput placeholder="Name" value={item.name} onChange={(val) => setNestedData(`testimonials.items.${index}.name`, val)} className="mb-2" />
            <I18nInput placeholder="Title/Role" value={item.title} onChange={(val) => setNestedData(`testimonials.items.${index}.title`, val)} className="mb-2" />
          </div>
        ))}
        <button type="button"           onClick={() => {
            setNestedData('testimonials.items', [...(data.testimonials.items || []), { quote: '', name: '', title: '', imageUrl: '' }]);
          }}
          className="w-full py-2 border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent hover:border-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> Add Testimonial
        </button>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="testimonials" data={data} setNestedData={setNestedData} />
      {/* Card Styling */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Card Styling
        </label>

        <div className="mb-4">
          <Select
            label={t('controls.styleVariant')}
            value={(data.testimonials as any).testimonialsVariant || 'classic'}
            onChange={(v) => setNestedData('testimonials.testimonialsVariant', v)}
            options={[
              { value: 'classic', label: 'Classic' },
              { value: 'minimal-cards', label: 'Minimal Cards' },
              { value: 'glassmorphism', label: 'Glassmorphism' },
              { value: 'gradient-glow', label: 'Gradient Glow' },
              { value: 'neon-border', label: 'Neon Border' },
              { value: 'floating-cards', label: 'Floating Cards' },
              { value: 'gradient-shift', label: 'Gradient Shift' },
              { value: 'neon-glow', label: 'Neon Glow (Resplandor Interior)' }
            ]}
          />
        </div>

        {/* Neon Glow Controls */}
        {(data.testimonials as any).testimonialsVariant === 'neon-glow' && (
          <div className="mb-4 bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3">
            <CardGlowControl
              enabled={data.testimonials.cardGlow?.enabled !== false}
              color={data.testimonials.cardGlow?.color || '#144CCD'}
              intensity={data.testimonials.cardGlow?.intensity ?? 100}
              borderRadius={data.testimonials.cardGlow?.borderRadius ?? 80}
              gradientStart={data.testimonials.cardGlow?.gradientStart || '#0A0909'}
              gradientEnd={data.testimonials.cardGlow?.gradientEnd || '#09101F'}
              onEnabledChange={(v) => setNestedData('testimonials.cardGlow.enabled', v)}
              onColorChange={(v) => setNestedData('testimonials.cardGlow.color', v)}
              onIntensityChange={(v) => setNestedData('testimonials.cardGlow.intensity', v)}
              onBorderRadiusChange={(v) => setNestedData('testimonials.cardGlow.borderRadius', v)}
              onGradientStartChange={(v) => setNestedData('testimonials.cardGlow.gradientStart', v)}
              onGradientEndChange={(v) => setNestedData('testimonials.cardGlow.gradientEnd', v)}
            />
          </div>
        )}

        <ColorControl label={t('controls.cardBackground')} value={data.testimonials.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('testimonials.colors.cardBackground', v)} />

        <BorderRadiusSelector label={t('controls.cardCorners')} value={data.testimonials.borderRadius || 'xl'} onChange={(v) => setNestedData('testimonials.borderRadius', v)} />

        <div className="mb-3">
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.cardShadow')}</label>
          <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
            {['none', 'sm', 'md', 'lg', 'xl'].map((shadow) => (
              <button type="button"                 key={shadow}
                onClick={() => setNestedData('testimonials.cardShadow', shadow)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors uppercase ${(data.testimonials.cardShadow || 'lg') === shadow ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
              >
                {shadow}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.borderStyle')}</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'none', label: 'None' },
              { value: 'solid', label: 'Solid' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'glow', label: 'Glow' }
            ].map(style => (
              <button type="button"                 key={style.value}
                onClick={() => setNestedData('testimonials.borderStyle', style.value)}
                className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${(data.testimonials.borderStyle || 'solid') === style.value ? 'bg-q-accent text-q-bg' : 'bg-q-bg text-q-text-secondary hover:bg-q-surface-overlay border border-q-border'}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <ColorControl label={t('controls.borderColor')} value={data.testimonials.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('testimonials.colors.borderColor', v)} />

        <div className="mb-3">
          <SliderControl
            label={t('controls.cardPadding')}
            value={data.testimonials.cardPadding || 32}
            onChange={(v) => setNestedData('testimonials.cardPadding', v)}
            min={16}
            max={64}
            step={4}
            suffix="px"
          />
        </div>
      </div>

      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Settings size={14} />
          Spacing
        </label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data.testimonials.paddingY || 'md'} onChange={(v) => setNestedData('testimonials.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data.testimonials.paddingX || 'md'} onChange={(v) => setNestedData('testimonials.paddingX', v)} />
        </div>
      </div>

      {/* Section Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Section Colors
        </label>
        <ColorControl label={t('editor.controls.common.background')} value={data.testimonials.colors?.background || '#000000'} onChange={(v) => setNestedData('testimonials.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.testimonials.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.description')} value={data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.description', v)} />
        <ColorControl label={t('controls.text')} value={data.testimonials.colors?.text || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.text', v)} />
        <ColorControl label={t('controls.personTitle')} value={data.testimonials.colors?.subtitleColor || data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.subtitleColor', v)} />
        <ColorControl label={t('controls.accent')} value={data.testimonials.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('testimonials.colors.accent', v)} />


        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data.testimonials.cornerGradient?.enabled || false}
          position={data.testimonials.cornerGradient?.position || 'top-left'}
          color={data.testimonials.cornerGradient?.color || '#4f46e5'}
          opacity={data.testimonials.cornerGradient?.opacity || 30}
          size={data.testimonials.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('testimonials.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('testimonials.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('testimonials.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('testimonials.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('testimonials.cornerGradient.size', v)}
        />
      </div>

      {/* Animation Controls */}
      <AnimationControls
        animationType={data.testimonials.animationType || 'fade-in-up'}
        enableCardAnimation={data.testimonials.enableCardAnimation !== false}
        onChangeAnimationType={(type) => setNestedData('testimonials.animationType', type)}
        onToggleAnimation={(enabled) => setNestedData('testimonials.enableCardAnimation', enabled)}
        label={t('editor.controls.common.cardAnimations')}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
