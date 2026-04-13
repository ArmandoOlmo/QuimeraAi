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


export const renderServicesControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls: renderListSectionControlsFn } = deps;
  if (!data?.services) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Services Variant Selector */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
          Services Style
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['cards', 'grid', 'minimal'].map((variant) => (
            <button
              key={variant}
              onClick={() => setNestedData('services.servicesVariant', variant)}
              className={`px-2 py-2 rounded-md border text-xs transition-all capitalize ${(data?.services?.servicesVariant || 'cards') === variant
                ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold'
                : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                }`}
            >
              {variant}
            </button>
          ))}
        </div>
        <p className="text-xs text-editor-text-secondary mt-2 italic">
          {(data?.services?.servicesVariant || 'cards') === 'cards' && '✨ Standard centered cards with hover effects.'}
          {(data?.services?.servicesVariant || 'cards') === 'grid' && '🎨 Modern bento-style grid with left alignment.'}
          {(data?.services?.servicesVariant || 'cards') === 'minimal' && '📋 Clean list layout for a professional look.'}
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
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="services" />
      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.services?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('services.colors.background', v)} />
        <ColorControl label="Section Title" value={data?.services?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('services.colors.heading', v)} />
        <ColorControl label="Section Description" value={data?.services?.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('services.colors.description', v)} />
        <ColorControl label="Accent" value={data?.services?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('services.colors.accent', v)} />
      </div>


      {/* Card Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
        <ColorControl label="Card Background" value={data?.services?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('services.colors.cardBackground', v)} />
        <ColorControl label="Card Title" value={data?.services?.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('services.colors.cardHeading', v)} />
        <ColorControl label="Card Text" value={data?.services?.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('services.colors.cardText', v)} />
        <ColorControl label="Border Color" value={data?.services?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('services.colors.borderColor', v)} />
      </div>


      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
        <div className="space-y-1">
          <PaddingSelector label="Vertical" value={data?.services?.paddingY || 'md'} onChange={(v) => setNestedData('services.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data?.services?.paddingX || 'md'} onChange={(v) => setNestedData('services.paddingX', v)} />
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
