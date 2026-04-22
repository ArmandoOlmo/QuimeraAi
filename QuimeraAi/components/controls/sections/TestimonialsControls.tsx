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
import { Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector } from '../../ui/EditorControlPrimitives';
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
      <Input label={t('editor.controls.common.title')} value={data.testimonials.title} onChange={(e) => setNestedData('testimonials.title', e.target.value)} />
      <FontSizeSelector label={`${t('editor.controls.common.title')} ${t('editor.controls.common.size')}`} value={data.testimonials.titleFontSize || 'md'} onChange={(v) => setNestedData('testimonials.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data.testimonials.description} onChange={(e) => setNestedData('testimonials.description', e.target.value)} rows={2} />
      <FontSizeSelector label={`${t('editor.controls.common.description')} ${t('editor.controls.common.size')}`} value={data.testimonials.descriptionFontSize || 'md'} onChange={(v) => setNestedData('testimonials.descriptionFontSize', v)} />

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.testimonials.cardStyling')}</label>

      <div className="mb-4">
        <Select
          label="Style Variant"
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
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.testimonials.cardShadow')}</label>
        <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
          {['none', 'sm', 'md', 'lg', 'xl'].map((shadow) => (
            <button
              key={shadow}
              onClick={() => setNestedData('testimonials.cardShadow', shadow)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors uppercase ${(data.testimonials.cardShadow || 'lg') === shadow ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
            >
              {shadow}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.testimonials.borderStyle')}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'none', label: t('editor.controls.testimonials.none') },
            { value: 'solid', label: t('editor.controls.testimonials.solid') },
            { value: 'gradient', label: t('editor.controls.testimonials.gradient') },
            { value: 'glow', label: t('editor.controls.testimonials.glow') }
          ].map(style => (
            <button
              key={style.value}
              onClick={() => setNestedData('testimonials.borderStyle', style.value)}
              className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${(data.testimonials.borderStyle || 'solid') === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <ColorControl label={t('editor.controls.testimonials.borderColor')} value={data.testimonials.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('testimonials.colors.borderColor', v)} />

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Padding</label>
          <span className="text-xs text-editor-text-primary">{data.testimonials.cardPadding || 32}px</span>
        </div>
        <input
          type="range" min="16" max="64" step="4"
          value={data.testimonials.cardPadding || 32}
          onChange={(e) => setNestedData('testimonials.cardPadding', parseInt(e.target.value))}
          className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
        />
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
        <div className="space-y-1">
          <PaddingSelector label="Vertical" value={data.testimonials.paddingY || 'md'} onChange={(v) => setNestedData('testimonials.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data.testimonials.paddingX || 'md'} onChange={(v) => setNestedData('testimonials.paddingX', v)} />
        </div>
      </div>

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Section Colors</label>
      <ColorControl label={t('editor.controls.common.background')} value={data.testimonials.colors?.background || '#000000'} onChange={(v) => setNestedData('testimonials.colors.background', v)} />
      <ColorControl label={t('editor.controls.common.title')} value={data.testimonials.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.heading', v)} />
      <ColorControl label={t('editor.controls.common.description')} value={data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.description', v)} />
      <ColorControl label="Text" value={data.testimonials.colors?.text || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.text', v)} />
      <ColorControl label="Person Title" value={data.testimonials.colors?.subtitleColor || data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.subtitleColor', v)} />
      <ColorControl label="Accent" value={data.testimonials.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('testimonials.colors.accent', v)} />


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

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Testimonials</label>
      {(data.testimonials.items || []).map((item: any, index: number) => (
        <div
          key={index}
          data-section-item={`testimonials:${index}`}
          className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-editor-text-secondary">Testimonial #{index + 1}</span>
            <button
              onClick={() => {
                const newItems = (data.testimonials.items || []).filter((_: any, i: number) => i !== index);
                setNestedData('testimonials.items', newItems);
              }}
              className="text-editor-text-secondary hover:text-red-400 transition-colors"
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
          <textarea
            placeholder="Quote"
            value={item.quote}
            onChange={(e) => setNestedData(`testimonials.items.${index}.quote`, e.target.value)}
            rows={2}
            className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
          />
          <input
            placeholder="Name"
            value={item.name}
            onChange={(e) => setNestedData(`testimonials.items.${index}.name`, e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
          />
          <input
            placeholder="Role"
            value={item.title}
            onChange={(e) => setNestedData(`testimonials.items.${index}.title`, e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
          />
        </div>
      ))}
      <button
        onClick={() => {
          const newItem = { quote: '', name: '', title: '', imageUrl: '' };
          setNestedData('testimonials.items', [...(data.testimonials.items || []), newItem]);
        }}
        className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
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
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <FileText size={14} />
          Section Header
        </label>
        <Input label={t('editor.controls.common.title')} value={data.testimonials.title} onChange={(e) => setNestedData('testimonials.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.testimonials.titleFontSize || 'md'} onChange={(v) => setNestedData('testimonials.titleFontSize', v)} />
        <TextArea label={t('editor.controls.common.description')} value={data.testimonials.description} onChange={(e) => setNestedData('testimonials.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.testimonials.descriptionFontSize || 'md'} onChange={(v) => setNestedData('testimonials.descriptionFontSize', v)} />
      </div>

      {/* Testimonials Items */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <MessageSquare size={14} />
          Testimonials List
        </label>
        {(data.testimonials.items || []).map((item: any, index: number) => (
          <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-editor-text-secondary">Testimonial #{index + 1}</span>
              <button
                onClick={() => {
                  const newItems = (data.testimonials.items || []).filter((_: any, i: number) => i !== index);
                  setNestedData('testimonials.items', newItems);
                }}
                className="text-editor-text-secondary hover:text-red-400 transition-colors"
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
            <textarea
              placeholder="Quote"
              value={item.quote}
              onChange={(e) => setNestedData(`testimonials.items.${index}.quote`, e.target.value)}
              rows={3}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
            <Input placeholder="Name" value={item.name} onChange={(e) => setNestedData(`testimonials.items.${index}.name`, e.target.value)} className="mb-2" />
            <Input placeholder="Title/Role" value={item.title} onChange={(e) => setNestedData(`testimonials.items.${index}.title`, e.target.value)} className="mb-2" />
          </div>
        ))}
        <button
          onClick={() => {
            setNestedData('testimonials.items', [...(data.testimonials.items || []), { quote: '', name: '', title: '', imageUrl: '' }]);
          }}
          className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus size={14} /> Add Testimonial
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
          checked={data?.testimonials?.glassEffect || false}
          onChange={(v) => setNestedData('testimonials.glassEffect', v)}
        />
      </div>
      <BackgroundImageControl sectionKey="testimonials" data={data} setNestedData={setNestedData} />
      {/* Card Styling */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Card Styling
        </label>

        <div className="mb-4">
          <Select
            label="Style Variant"
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
          <div className="mb-4 bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
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

        <ColorControl label="Card Background" value={data.testimonials.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('testimonials.colors.cardBackground', v)} />

        <BorderRadiusSelector label="Card Corners" value={data.testimonials.borderRadius || 'xl'} onChange={(v) => setNestedData('testimonials.borderRadius', v)} />

        <div className="mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Card Shadow</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
            {['none', 'sm', 'md', 'lg', 'xl'].map((shadow) => (
              <button
                key={shadow}
                onClick={() => setNestedData('testimonials.cardShadow', shadow)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors uppercase ${(data.testimonials.cardShadow || 'lg') === shadow ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
              >
                {shadow}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Border Style</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'none', label: 'None' },
              { value: 'solid', label: 'Solid' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'glow', label: 'Glow' }
            ].map(style => (
              <button
                key={style.value}
                onClick={() => setNestedData('testimonials.borderStyle', style.value)}
                className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${(data.testimonials.borderStyle || 'solid') === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <ColorControl label="Border Color" value={data.testimonials.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('testimonials.colors.borderColor', v)} />

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Padding</label>
            <span className="text-xs text-editor-text-primary">{data.testimonials.cardPadding || 32}px</span>
          </div>
          <input
            type="range" min="16" max="64" step="4"
            value={data.testimonials.cardPadding || 32}
            onChange={(e) => setNestedData('testimonials.cardPadding', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>
      </div>

      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Settings size={14} />
          Spacing
        </label>
        <div className="space-y-1">
          <PaddingSelector label="Vertical" value={data.testimonials.paddingY || 'md'} onChange={(v) => setNestedData('testimonials.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data.testimonials.paddingX || 'md'} onChange={(v) => setNestedData('testimonials.paddingX', v)} />
        </div>
      </div>

      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Section Colors
        </label>
        <ColorControl label={t('editor.controls.common.background')} value={data.testimonials.colors?.background || '#000000'} onChange={(v) => setNestedData('testimonials.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.testimonials.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.description')} value={data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.description', v)} />
        <ColorControl label="Text" value={data.testimonials.colors?.text || '#ffffff'} onChange={(v) => setNestedData('testimonials.colors.text', v)} />
        <ColorControl label="Person Title" value={data.testimonials.colors?.subtitleColor || data.testimonials.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('testimonials.colors.subtitleColor', v)} />
        <ColorControl label="Accent" value={data.testimonials.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('testimonials.colors.accent', v)} />


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
