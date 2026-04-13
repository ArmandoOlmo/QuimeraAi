/**
 * PricingControls.tsx
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


export const renderPricingControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.pricing) return null;
  const currentVariant = data.pricing.pricingVariant || 'classic';

  return (
    <div className="space-y-4">
      {/* Variant Selector */}
      <div className="mb-4">
        <Select
          label={t('editor.controls.pricing.styleVariant')}
          value={currentVariant || 'classic'}
          onChange={(v) => setNestedData('pricing.pricingVariant', v)}
          options={[
            { value: 'classic', label: `${t('editor.controls.pricing.classic')} - ${t('editor.controls.pricing.classicDesc')}` },
            { value: 'gradient', label: `${t('editor.controls.pricing.gradient')} - ${t('editor.controls.pricing.gradientDesc')}` },
            { value: 'glassmorphism', label: `${t('editor.controls.pricing.glassmorphism')} - ${t('editor.controls.pricing.glassmorphismDesc')}` },
            { value: 'minimalist', label: `${t('editor.controls.pricing.minimalist')} - ${t('editor.controls.pricing.minimalistDesc')}` },
            { value: 'comparison', label: `Comparison - Detailed` }
          ]}
        />
      </div>


      <Input label={t('editor.controls.common.title')} value={data.pricing.title} onChange={(e) => setNestedData('pricing.title', e.target.value)} />
      <FontSizeSelector label={`${t('editor.controls.common.title')} ${t('editor.controls.common.size')}`} value={data.pricing.titleFontSize || 'md'} onChange={(v) => setNestedData('pricing.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data.pricing.description} onChange={(e) => setNestedData('pricing.description', e.target.value)} rows={2} />
      <FontSizeSelector label={`${t('editor.controls.common.description')} ${t('editor.controls.common.size')}`} value={data.pricing.descriptionFontSize || 'md'} onChange={(v) => setNestedData('pricing.descriptionFontSize', v)} />

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.common.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('editor.controls.common.vertical')} value={data.pricing.paddingY || 'md'} onChange={(v) => setNestedData('pricing.paddingY', v)} />
          <PaddingSelector label={t('editor.controls.common.horizontal')} value={data.pricing.paddingX || 'md'} onChange={(v) => setNestedData('pricing.paddingX', v)} />
        </div>
      </div>

      <BorderRadiusSelector label={t('editor.controls.pricing.cardCorners')} value={data.pricing.cardBorderRadius || 'xl'} onChange={(v) => setNestedData('pricing.cardBorderRadius', v)} />

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.pricing.sectionColors')}</label>
      <ColorControl label={t('editor.controls.common.background')} value={data.pricing.colors?.background} onChange={(v) => setNestedData('pricing.colors.background', v)} />
      <ColorControl label={t('editor.controls.common.title')} value={data.pricing.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.heading', v)} />
      <ColorControl label={t('editor.controls.common.description')} value={data.pricing.colors?.description || data.pricing.colors?.text} onChange={(v) => setNestedData('pricing.colors.description', v)} />
      <ColorControl label={t('editor.controls.common.text')} value={data.pricing.colors?.text} onChange={(v) => setNestedData('pricing.colors.text', v)} />


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data.pricing.cornerGradient?.enabled || false}
        position={data.pricing.cornerGradient?.position || 'top-left'}
        color={data.pricing.cornerGradient?.color || '#4f46e5'}
        opacity={data.pricing.cornerGradient?.opacity || 30}
        size={data.pricing.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('pricing.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('pricing.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('pricing.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('pricing.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('pricing.cornerGradient.size', v)}
      />

      {/* Gradient Colors - Only for gradient variant */}
      {currentVariant === 'gradient' && (
        <>
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-editor-accent" />
            {t('editor.controls.pricing.gradientColors')}
          </label>
          <div className="space-y-1">
            <ColorControl label={t('editor.controls.pricing.gradientStart')} value={data.pricing.colors?.gradientStart || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.gradientStart', v)} />
            <ColorControl label={t('editor.controls.pricing.gradientEnd')} value={data.pricing.colors?.gradientEnd || '#10b981'} onChange={(v) => setNestedData('pricing.colors.gradientEnd', v)} />
          </div>
          <div className="mt-2 p-3 rounded-lg" style={{
            backgroundImage: `linear-gradient(135deg, ${data.pricing.colors?.gradientStart || '#4f46e5'}, ${data.pricing.colors?.gradientEnd || '#10b981'})`
          }}>
            <p className="text-xs text-white font-semibold text-center">{t('editor.controls.pricing.gradientPreview')}</p>
          </div>
        </>
      )}

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.pricing.cardColors')}</label>
      <ColorControl label={t('editor.controls.pricing.cardBackground')} value={data.pricing.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('pricing.colors.cardBackground', v)} />
      <ColorControl label={t('editor.controls.pricing.cardTitle')} value={data.pricing.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.cardHeading', v)} />
      <ColorControl label={t('editor.controls.pricing.cardText')} value={data.pricing.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('pricing.colors.cardText', v)} />
      <ColorControl label={t('editor.controls.pricing.priceColor')} value={data.pricing.colors?.priceColor || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.priceColor', v)} />
      <ColorControl label={t('editor.controls.pricing.borderColor')} value={data.pricing.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('pricing.colors.borderColor', v)} />
      <ColorControl label={t('editor.controls.pricing.featuredAccent')} value={data.pricing.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.accent', v)} />
      <ColorControl label={t('editor.controls.pricing.checkmarkIcon')} value={data.pricing.colors?.checkmarkColor || '#10b981'} onChange={(v) => setNestedData('pricing.colors.checkmarkColor', v)} />

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.pricing.defaultButtonColors')}</label>
      <div className="space-y-1">
        <ColorControl label={t('editor.controls.common.background')} value={data.pricing.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.buttonBackground', v)} />
        <ColorControl label={t('editor.controls.common.text')} value={data.pricing.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.buttonText', v)} />
      </div>

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.pricing.pricingTiers')}</label>
      {(data.pricing.tiers || []).map((tier, index) => (
        <div key={index} className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-3 group">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-editor-text-secondary">{t('editor.controls.pricing.tier')} #{index + 1}</span>
            <button onClick={() => {
              const newTiers = data.pricing.tiers.filter((_, i) => i !== index);
              setNestedData('pricing.tiers', newTiers);
            }} className="text-editor-text-secondary hover:text-red-400"><Trash2 size={14} /></button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={t('editor.controls.pricing.planName')} value={tier.name} onChange={(e) => setNestedData(`pricing.tiers.${index}.name`, e.target.value)} className="mb-0" />
              <Input placeholder={t('editor.controls.pricing.price')} value={tier.price} onChange={(e) => setNestedData(`pricing.tiers.${index}.price`, e.target.value)} className="mb-0" />
            </div>

            <Input placeholder={t('editor.controls.pricing.frequency')} value={tier.frequency} onChange={(e) => setNestedData(`pricing.tiers.${index}.frequency`, e.target.value)} className="mb-0" />

            <TextArea
              placeholder={`${t('editor.controls.common.description')} (${t('editor.controls.common.optional') || 'Optional'})`}
              value={tier.description || ''}
              onChange={(e) => setNestedData(`pricing.tiers.${index}.description`, e.target.value)}
              rows={2}
              className="mb-0"
            />

            <div>
              <label className="block text-[10px] font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.pricing.featuresHelp')}</label>
              <textarea
                value={tier.features.join('\n')}
                onChange={(e) => setNestedData(`pricing.tiers.${index}.features`, e.target.value.split('\n').filter(f => f.trim()))}
                rows={4}
                placeholder={t('editor.controls.pricing.featurePlaceholder')}
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-3 py-2 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Button Text"
                value={tier.buttonText}
                onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonText`, e.target.value)}
                className="mb-0"
              />
              <Input
                placeholder="Button Link"
                value={tier.buttonLink || ''}
                onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonLink`, e.target.value)}
                className="mb-0"
              />
            </div>

            <ToggleControl
              label={t('editor.controls.pricing.featuredPlan')}
              checked={tier.featured}
              onChange={(v) => setNestedData(`pricing.tiers.${index}.featured`, v)}
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => setNestedData('pricing.tiers', [
          ...data.pricing.tiers,
          { name: 'New Plan', price: '$0', frequency: '/mo', description: '', features: [], buttonText: 'Get Started', buttonLink: '#', featured: false }
        ])}
        className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus size={14} /> {t('editor.controls.pricing.addTier')}
      </button>


      {/* Animation Controls */}
      <AnimationControls
        animationType={data.pricing.animationType || 'fade-in-up'}
        enableCardAnimation={data.pricing.enableCardAnimation !== false}
        onChangeAnimationType={(type) => setNestedData('pricing.animationType', type)}
        onToggleAnimation={(enabled) => setNestedData('pricing.enableCardAnimation', enabled)}
        label={t('editor.controls.pricing.animation')}
      />
    </div>
  );
}

// ─── ─── ─── ─── ─── ─── ───

export const renderPricingControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.pricing) return null;
  const currentVariant = data.pricing.pricingVariant || 'classic';

  const contentTab = (
    <div className="space-y-4">
      {/* Variant Selector */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">Style Variant</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'classic', label: 'Classic', desc: 'Traditional card layout' },
            { value: 'gradient', label: 'Gradient', desc: 'Vibrant gradients' },
            { value: 'glassmorphism', label: 'Glass', desc: 'Frosted glass effect' },
            { value: 'minimalist', label: 'Minimal', desc: 'Clean & simple' }
          ].map((variant) => (
            <button
              key={variant.value}
              onClick={() => setNestedData('pricing.pricingVariant', variant.value)}
              className={`
                p-3 text-left rounded-lg border transition-all
                ${currentVariant === variant.value
                  ? 'bg-editor-accent border-editor-accent text-editor-bg'
                  : 'bg-editor-panel-bg border-editor-border text-editor-text-secondary hover:border-editor-accent/50'
                }
              `}
            >
              <div className={`text-xs font-bold mb-1 ${currentVariant === variant.value ? 'text-editor-bg' : 'text-editor-text-primary'}`}>
                {variant.label}
              </div>
              <div className={`text-[10px] ${currentVariant === variant.value ? 'text-editor-bg/80' : 'text-editor-text-secondary'}`}>
                {variant.desc}
              </div>
            </button>
          ))}
        </div>
      </div>


      <Input label={t('editor.controls.common.title')} value={data.pricing.title} onChange={(e) => setNestedData('pricing.title', e.target.value)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.pricing.titleFontSize || 'md'} onChange={(v) => setNestedData('pricing.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data.pricing.description} onChange={(e) => setNestedData('pricing.description', e.target.value)} rows={2} />
      <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.pricing.descriptionFontSize || 'md'} onChange={(v) => setNestedData('pricing.descriptionFontSize', v)} />


      {/* Pricing Tiers */}
      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Pricing Tiers</label>
      {(data.pricing.tiers || []).map((tier: any, index: number) => (
        <div
          key={index}
          data-section-item={`pricing:${index}`}
          className="bg-editor-bg p-4 rounded-lg border border-editor-border mb-3 group"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-editor-text-secondary">Tier #{index + 1}</span>
            <button onClick={() => {
              const newTiers = data.pricing.tiers.filter((_: any, i: number) => i !== index);
              setNestedData('pricing.tiers', newTiers);
            }} className="text-editor-text-secondary hover:text-red-400"><Trash2 size={14} /></button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Plan Name" value={tier.name} onChange={(e) => setNestedData(`pricing.tiers.${index}.name`, e.target.value)} className="mb-0" />
              <Input placeholder="Price" value={tier.price} onChange={(e) => setNestedData(`pricing.tiers.${index}.price`, e.target.value)} className="mb-0" />
            </div>

            <Input placeholder="Frequency (e.g. /month)" value={tier.frequency} onChange={(e) => setNestedData(`pricing.tiers.${index}.frequency`, e.target.value)} className="mb-0" />

            <TextArea
              placeholder="Description (optional)"
              value={tier.description || ''}
              onChange={(e) => setNestedData(`pricing.tiers.${index}.description`, e.target.value)}
              rows={2}
              className="mb-0"
            />

            <div>
              <label className="block text-[10px] font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Features (One per line)</label>
              <textarea
                value={tier.features.join('\n')}
                onChange={(e) => setNestedData(`pricing.tiers.${index}.features`, e.target.value.split('\n').filter((f: string) => f.trim()))}
                rows={4}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                className="w-full bg-editor-panel-bg border border-editor-border rounded px-3 py-2 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Button Text"
                value={tier.buttonText}
                onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonText`, e.target.value)}
                className="mb-0"
              />
              <Input
                placeholder="Button Link"
                value={tier.buttonLink || ''}
                onChange={(e) => setNestedData(`pricing.tiers.${index}.buttonLink`, e.target.value)}
                className="mb-0"
              />
            </div>

            <ToggleControl
              label="Featured Plan (Highlighted)"
              checked={tier.featured}
              onChange={(v) => setNestedData(`pricing.tiers.${index}.featured`, v)}
            />
          </div>
        </div>
      ))}

      <button
        onClick={() => setNestedData('pricing.tiers', [
          ...data.pricing.tiers,
          { name: 'New Plan', price: '$0', frequency: '/mo', description: '', features: [], buttonText: 'Get Started', buttonLink: '#', featured: false }
        ])}
        className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent hover:border-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus size={14} /> Add Pricing Tier
      </button>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="pricing" />
      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
        <div className="space-y-1">
          <PaddingSelector label="Vertical" value={data.pricing.paddingY || 'md'} onChange={(v) => setNestedData('pricing.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data.pricing.paddingX || 'md'} onChange={(v) => setNestedData('pricing.paddingX', v)} />
        </div>
      </div>

      <BorderRadiusSelector label="Card Corners" value={data.pricing.cardBorderRadius || 'xl'} onChange={(v) => setNestedData('pricing.cardBorderRadius', v)} />


      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.pricing.colors?.background} onChange={(v) => setNestedData('pricing.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.pricing.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.description')} value={data.pricing.colors?.description || data.pricing.colors?.text} onChange={(v) => setNestedData('pricing.colors.description', v)} />
        <ColorControl label="Text" value={data.pricing.colors?.text} onChange={(v) => setNestedData('pricing.colors.text', v)} />
      </div>


      {/* Card Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
        <ColorControl label="Card Background" value={data.pricing.colors?.cardBackground || '#1f2937'} onChange={(v) => setNestedData('pricing.colors.cardBackground', v)} />
        <ColorControl label="Card Title" value={data.pricing.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.cardHeading', v)} />
        <ColorControl label="Card Text" value={data.pricing.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('pricing.colors.cardText', v)} />
        <ColorControl label="Price Color" value={data.pricing.colors?.priceColor || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.priceColor', v)} />
        <ColorControl label="Border Color" value={data.pricing.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('pricing.colors.borderColor', v)} />
        <ColorControl label="Featured Accent" value={data.pricing.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.accent', v)} />
        <ColorControl label="Checkmark Icon" value={data.pricing.colors?.checkmarkColor || '#10b981'} onChange={(v) => setNestedData('pricing.colors.checkmarkColor', v)} />
      </div>


      {/* Button Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Button Colors</label>
        <div className="space-y-1">
          <ColorControl label={t('editor.controls.common.background')} value={data.pricing.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.buttonBackground', v)} />
          <ColorControl label="Text" value={data.pricing.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('pricing.colors.buttonText', v)} />
        </div>
      </div>

      {/* Gradient Colors - Only for gradient variant */}
      {currentVariant === 'gradient' && (
        <>
          <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-editor-accent" />
              Gradient Colors
            </label>
            <div className="space-y-1">
              <ColorControl label="Start" value={data.pricing.colors?.gradientStart || '#4f46e5'} onChange={(v) => setNestedData('pricing.colors.gradientStart', v)} />
              <ColorControl label="End" value={data.pricing.colors?.gradientEnd || '#10b981'} onChange={(v) => setNestedData('pricing.colors.gradientEnd', v)} />
            </div>
            <div className="mt-2 p-3 rounded-lg" style={{
              backgroundImage: `linear-gradient(135deg, ${data.pricing.colors?.gradientStart || '#4f46e5'}, ${data.pricing.colors?.gradientEnd || '#10b981'})`
            }}>
              <p className="text-xs text-white font-semibold text-center">Gradient Preview</p>
            </div>
          </div>
        </>
      )}


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data.pricing.cornerGradient?.enabled || false}
        position={data.pricing.cornerGradient?.position || 'top-left'}
        color={data.pricing.cornerGradient?.color || '#4f46e5'}
        opacity={data.pricing.cornerGradient?.opacity || 30}
        size={data.pricing.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('pricing.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('pricing.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('pricing.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('pricing.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('pricing.cornerGradient.size', v)}
      />


      {/* Animation Controls */}
      <AnimationControls
        animationType={data.pricing.animationType || 'fade-in-up'}
        enableCardAnimation={data.pricing.enableCardAnimation !== false}
        onChangeAnimationType={(type) => setNestedData('pricing.animationType', type)}
        onToggleAnimation={(enabled) => setNestedData('pricing.enableCardAnimation', enabled)}
        label={t('editor.controls.common.cardAnimations')}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
