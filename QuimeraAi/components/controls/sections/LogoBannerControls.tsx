/**
 * LogoBannerControls.tsx
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


export const renderLogoBannerControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.logoBanner) return null;

  const logos = data.logoBanner.logos || [];

  const contentTab = (
    <div className="space-y-3">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t("controls.glassmorphismTransparencia", "Glassmorphism Background")}
          checked={data?.logoBanner?.glassEffect || false}
          onChange={(v) => setNestedData("logoBanner.glassEffect", v)}
        />
      </div>

      <Input label={t('controls.title')} value={data.logoBanner.title || ''} onChange={(e) => setNestedData('logoBanner.title', e.target.value)} placeholder="Trusted by industry leaders" />
      <Input label={t('controls.subtitle')} value={data.logoBanner.subtitle || ''} onChange={(e) => setNestedData('logoBanner.subtitle', e.target.value)} placeholder="" />

      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Logos</div>
      {logos.map((logo: any, idx: number) => (
        <div key={idx} className="bg-editor-card rounded-lg p-3 space-y-2 border border-editor-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-editor-text-primary">Logo {idx + 1}</span>
            {logos.length > 1 && (
              <button type="button"                 onClick={() => {
                  const updated = logos.filter((_: any, i: number) => i !== idx);
                  setNestedData('logoBanner.logos', updated);
                }}
                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                title="Remove"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <ImagePicker
            label={t('controls.logoImage')}
            value={logo.imageUrl}
            onChange={(url) => setNestedData(`logoBanner.logos.${idx}.imageUrl`, url)}
          />
          <Input label={t('controls.altText')} value={logo.alt || ''} onChange={(e) => setNestedData(`logoBanner.logos.${idx}.alt`, e.target.value)} placeholder="Brand Name" />
          <Input label={t('controls.linkText')} value={logo.linkText || ''} onChange={(e) => setNestedData(`logoBanner.logos.${idx}.linkText`, e.target.value)} placeholder="Visit Brand" />

          {/* Link Type Selector */}
          <div>
            <div className="text-[10px] font-medium text-editor-text-secondary mb-1">Link Destination</div>
            <div className="flex bg-editor-bg rounded-md border border-editor-border p-0.5 mb-2">
              {[
                { value: 'manual', label: 'URL' },
                { value: 'content', label: 'Content' },
              ].map(type => (
                <button type="button"                   key={type.value}
                  onClick={() => setNestedData(`logoBanner.logos.${idx}.linkType`, type.value)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(logo.linkType || 'manual') === type.value
                    ? 'bg-editor-accent text-editor-bg'
                    : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-hover'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {(logo.linkType === 'manual' || !logo.linkType) && (
              <Input label={t('controls.linkUrl')} value={logo.link || ''} onChange={(e) => setNestedData(`logoBanner.logos.${idx}.link`, e.target.value)} placeholder="https://brand.com" />
            )}
            {logo.linkType === 'content' && (
              <SingleContentSelector
                selectedContentPath={logo.link}
                onSelect={(path) => setNestedData(`logoBanner.logos.${idx}.link`, path || '')}
                label={t('controls.selectContent')}
              />
            )}
          </div>
        </div>
      ))}

      <button type="button"         onClick={() => {
          const newLogo = { imageUrl: '', alt: `Brand ${logos.length + 1}`, link: '', linkText: '' };
          setNestedData('logoBanner.logos', [...logos, newLogo]);
        }}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium transition-colors"
      >
        <PlusCircle size={14} /> Add Logo
      </button>
    </div>
  );

  const styleTab = (
    <div className="space-y-3">      {/* Scroll */}
      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Behavior</div>
      <ToggleControl label={t('controls.scrollMarquee')} checked={data.logoBanner.scrollEnabled ?? false} onChange={(v) => setNestedData('logoBanner.scrollEnabled', v)} />
      <ToggleControl label={t('controls.pauseOnHover')} checked={data.logoBanner.pauseOnHover ?? true} onChange={(v) => setNestedData('logoBanner.pauseOnHover', v)} />
      <ToggleControl label={t('controls.grayscaleColorOnHover')} checked={data.logoBanner.grayscale ?? true} onChange={(v) => setNestedData('logoBanner.grayscale', v)} />
      <ToggleControl label={t('controls.showDividerLines')} checked={data.logoBanner.showDivider ?? false} onChange={(v) => setNestedData('logoBanner.showDivider', v)} />

      {data.logoBanner.scrollEnabled && (
        <SliderControl
          label="Scroll Speed"
          value={data.logoBanner.scrollSpeed || 25}
          onChange={(v) => setNestedData('logoBanner.scrollSpeed', v)}
          min={5} max={60} step={5} suffix="s"
        />
      )}

      {/* Logo Size */}
      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Logo Size</div>
      <SliderControl
        label="Logo Height"
        value={data.logoBanner.logoHeight || 40}
        onChange={(v) => setNestedData('logoBanner.logoHeight', v)}
        min={20} max={100} step={5} suffix="px"
      />
      <SliderControl
        label="Gap Between Logos"
        value={data.logoBanner.logoGap || 48}
        onChange={(v) => setNestedData('logoBanner.logoGap', v)}
        min={16} max={96} step={8} suffix="px"
      />

      {/* Font sizes */}
      <FontSizeSelector label={t('controls.titleSize')} value={data.logoBanner.titleFontSize || 'sm'} onChange={(v) => setNestedData('logoBanner.titleFontSize', v)} />
      <FontSizeSelector label={t('controls.subtitleSize')} value={data.logoBanner.subtitleFontSize || 'sm'} onChange={(v) => setNestedData('logoBanner.subtitleFontSize', v)} />

      {/* Padding */}
      <div>
        <div className="text-[10px] font-medium text-editor-text-secondary mb-1">Padding</div>
        <div className="flex gap-1">
          {[
            { value: 'sm', label: 'S' },
            { value: 'md', label: 'M' },
            { value: 'lg', label: 'L' },
            { value: 'xl', label: 'XL' },
          ].map(opt => (
            <button type="button"               key={opt.value}
              onClick={() => setNestedData('logoBanner.paddingY', opt.value)}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                (data.logoBanner.paddingY || 'md') === opt.value
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500'
                  : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Background</div>
      <ToggleControl label={t('controls.useGradient')} checked={data.logoBanner.useGradient ?? false} onChange={(v) => setNestedData('logoBanner.useGradient', v)} />

      {data.logoBanner.useGradient ? (
        <div className="space-y-2">
          <ColorControl label={t('controls.gradientFrom')} value={data.logoBanner.gradientFrom || '#0f172a'} onChange={(v) => setNestedData('logoBanner.gradientFrom', v)} />
          <ColorControl label={t('controls.gradientTo')} value={data.logoBanner.gradientTo || '#1e293b'} onChange={(v) => setNestedData('logoBanner.gradientTo', v)} />
            <SliderControl
              label="Gradient Angle"
              value={data.logoBanner.gradientAngle ?? 90}
              onChange={(v) => setNestedData('logoBanner.gradientAngle', v)}
              min={0} max={360} step={15} suffix="°"
            />
        </div>
      ) : (
        <ColorControl label={t('controls.backgroundColor')} value={data.logoBanner.backgroundColor || '#ffffff'} onChange={(v) => setNestedData('logoBanner.backgroundColor', v)} />
      )}

      {/* Colors */}
      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Colors</div>
      <ColorControl label={t('controls.title')} value={data.logoBanner.titleColor || '#64748b'} onChange={(v) => setNestedData('logoBanner.titleColor', v)} />
      <ColorControl label={t('controls.subtitle')} value={data.logoBanner.subtitleColor || '#94a3b8'} onChange={(v) => setNestedData('logoBanner.subtitleColor', v)} />
      {data.logoBanner.showDivider && (
        <ColorControl label={t('controls.divider')} value={data.logoBanner.dividerColor || '#e2e8f0'} onChange={(v) => setNestedData('logoBanner.dividerColor', v)} />
      )}
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
