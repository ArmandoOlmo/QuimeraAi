/**
 * ServicesControls.tsx
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


export const renderServicesControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.services) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Services Variant Selector */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.servicesStyle')}</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {['cards', 'grid', 'minimal', 'neon-glow'].map((variant) => (
            <button type="button"               key={variant}
              onClick={() => setNestedData('services.servicesVariant', variant)}
              className={`px-2 py-2 rounded-md border text-xs transition-all capitalize ${(data?.services?.servicesVariant || 'cards') === variant
                ? 'bg-q-accent text-q-bg border-q-accent shadow-sm font-bold'
                : 'bg-q-surface text-q-text-primary border-q-border hover:border-q-accent'
                }`}
            >
              {variant === 'neon-glow' ? 'Neon Glow' : variant}
            </button>
          ))}
        </div>
        <p className="text-xs text-q-text-secondary mt-2 italic">
          {(data?.services?.servicesVariant || 'cards') === 'cards' && '✨ Standard centered cards with hover effects.'}
          {(data?.services?.servicesVariant || 'cards') === 'grid' && '🎨 Modern bento-style grid with left alignment.'}
          {(data?.services?.servicesVariant || 'cards') === 'minimal' && '📋 Clean list layout for a professional look.'}
          {(data?.services?.servicesVariant || 'cards') === 'neon-glow' && '🌟 Deep inner glow effect with customizable colors.'}
        </p>
      </div>


      {/* Service Items */}
      {renderListSectionControls('services', 'Service', [
        { key: 'title', label: 'Title', type: 'input' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'icon', label: 'Icon', type: 'icon-selector' }
      ])}
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="services" data={data} setNestedData={setNestedData} />

      {/* Neon Glow Controls */}
      {(data?.services?.servicesVariant === 'neon-glow') && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-3 mb-4">
          <CardGlowControl
            enabled={data.services.cardGlow?.enabled !== false}
            color={data.services.cardGlow?.color || '#144CCD'}
            intensity={data.services.cardGlow?.intensity ?? 100}
            borderRadius={data.services.cardGlow?.borderRadius ?? 80}
            gradientStart={data.services.cardGlow?.gradientStart || '#0A0909'}
            gradientEnd={data.services.cardGlow?.gradientEnd || '#09101F'}
            onEnabledChange={(v) => setNestedData('services.cardGlow.enabled', v)}
            onColorChange={(v) => setNestedData('services.cardGlow.color', v)}
            onIntensityChange={(v) => setNestedData('services.cardGlow.intensity', v)}
            onBorderRadiusChange={(v) => setNestedData('services.cardGlow.borderRadius', v)}
            onGradientStartChange={(v) => setNestedData('services.cardGlow.gradientStart', v)}
            onGradientEndChange={(v) => setNestedData('services.cardGlow.gradientEnd', v)}
          />
        </div>
      )}

      {/* Section Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.services?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('services.colors.background', v)} />
        <ColorControl label={t('controls.sectionTitle')} value={data?.services?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('services.colors.heading', v)} />
        <ColorControl label={t('controls.sectionDescription')} value={data?.services?.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('services.colors.description', v)} />
        <ColorControl label={t('controls.accent')} value={data?.services?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('services.colors.accent', v)} />
      </div>


      {/* Card Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.cardColors')}</label>
        <ColorControl label={t('controls.cardBackground')} value={data?.services?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('services.colors.cardBackground', v)} />
        <ColorControl label={t('controls.cardTitle')} value={data?.services?.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('services.colors.cardHeading', v)} />
        <ColorControl label={t('controls.cardText')} value={data?.services?.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('services.colors.cardText', v)} />
        <ColorControl label={t('controls.borderColor')} value={data?.services?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('services.colors.borderColor', v)} />
      </div>


      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data?.services?.paddingY || 'md'} onChange={(v) => setNestedData('services.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data?.services?.paddingX || 'md'} onChange={(v) => setNestedData('services.paddingX', v)} />
        </div>
      </div>


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data?.services?.cornerGradient?.enabled || false}
        position={data?.services?.cornerGradient?.position || 'top-left'}
        color={data?.services?.cornerGradient?.color || '#4f46e5'}
        opacity={data?.services?.cornerGradient?.opacity || 30}
        size={data?.services?.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('services.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('services.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('services.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('services.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('services.cornerGradient.size', v)}
      />


      {/* Animation Controls */}
      <AnimationControls
        animationType={data?.services?.animationType || 'fade-in-up'}
        enableCardAnimation={data?.services?.enableCardAnimation !== false}
        onChangeAnimationType={(type) => setNestedData('services.animationType', type)}
        onToggleAnimation={(enabled) => setNestedData('services.enableCardAnimation', enabled)}
        label={t('editor.controls.common.cardAnimations')}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
