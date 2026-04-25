/**
 * MenuControls.tsx
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


export const renderMenuControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.menu) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Menu Variant Selector */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <Layout size={14} />
          Menu Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'classic', label: '🍽️ Classic' },
            { value: 'modern-grid', label: '✨ Modern' },
            { value: 'elegant-list', label: '📋 Elegant' },
            { value: 'full-image', label: '📷 Full Photo' }
          ].map((variant) => (
            <button type="button"               key={variant.value}
              onClick={() => setNestedData('menu.menuVariant', variant.value)}
              className={`px-2 py-2 rounded-md border text-xs transition-all ${(data?.menu?.menuVariant || 'classic') === variant.value
                ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold'
                : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                }`}
            >
              {variant.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-editor-text-secondary mt-2 italic">
          {(data?.menu?.menuVariant || 'classic') === 'classic' && '🍽️ Traditional grid cards with images on top.'}
          {(data?.menu?.menuVariant || 'classic') === 'modern-grid' && '✨ Bento-style grid with dynamic layouts.'}
          {(data?.menu?.menuVariant || 'classic') === 'elegant-list' && '📋 Magazine-style horizontal list layout.'}
          {(data?.menu?.menuVariant || 'classic') === 'full-image' && '📷 Full photo cards with text overlay at bottom.'}
        </p>

        {/* Text Alignment - Only for full-image variant */}
        {data?.menu?.menuVariant === 'full-image' && (
          <div className="mt-4 pt-4 border-t border-editor-border/50 animate-fade-in-up">
            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('controls.textAlignment')}</label>
            <div className="flex gap-2">
              {[
                { value: 'left', icon: '◀', label: 'Left' },
                { value: 'center', icon: '●', label: 'Center' },
                { value: 'right', icon: '▶', label: 'Right' }
              ].map((align) => (
                <button type="button"                   key={align.value}
                  onClick={() => setNestedData('menu.textAlignment', align.value)}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-md border text-xs transition-all ${(data?.menu?.textAlignment || 'center') === align.value
                    ? 'bg-editor-accent text-editor-bg border-editor-accent font-bold'
                    : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                    }`}
                  title={align.label}
                >
                  <span>{align.icon}</span>
                  <span className="hidden sm:inline">{align.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Content Controls */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.content')}</label>
        <Input label={t('editor.controls.common.title')} value={data?.menu?.title || ''} onChange={(e) => setNestedData('menu.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.menu?.titleFontSize || 'md'} onChange={(v) => setNestedData('menu.titleFontSize', v)} />
        <TextArea label={t('editor.controls.common.description')} value={data?.menu?.description || ''} onChange={(e) => setNestedData('menu.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.menu?.descriptionFontSize || 'md'} onChange={(v) => setNestedData('menu.descriptionFontSize', v)} />
      </div>


      {/* Section Icon */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.sectionIcon')}</label>
        <ToggleControl
          label={t('editor.controls.common.showSectionIcon')}
          checked={data?.menu?.showIcon !== false}
          onChange={(v) => setNestedData('menu.showIcon', v)}
        />
        {data?.menu?.showIcon !== false && (
          <IconSelector
            label={t('editor.controls.common.icon')}
            value={data?.menu?.icon || 'utensils-crossed'}
            onChange={(v) => setNestedData('menu.icon', v)}
          />
        )}
      </div>


      {/* Menu Items */}
      {renderListSectionControls('menu', 'Dish', [
        { key: 'name', label: 'Dish Name', type: 'input' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'price', label: 'Price', type: 'input' },
        { key: 'imageUrl', label: 'Photo', type: 'image' },
        { key: 'category', label: 'Category', type: 'input' }
      ])}
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="menu" data={data} setNestedData={setNestedData} />
      {/* Section Colors */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.menu?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('menu.colors.background', v)} />
        <ColorControl label={t('controls.sectionTitle')} value={data?.menu?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('menu.colors.heading', v)} />
        <ColorControl label={t('controls.sectionText')} value={data?.menu?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('menu.colors.text', v)} />
        <ColorControl label={t('controls.accent')} value={data?.menu?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('menu.colors.accent', v)} />
      </div>


      {/* Card Colors */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.cardColors')}</label>
        <ColorControl label={t('controls.cardBackground')} value={data?.menu?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('menu.colors.cardBackground', v)} />
        <ColorControl label={t('controls.cardTitle')} value={data?.menu?.colors?.cardTitleColor || '#ffffff'} onChange={(v) => setNestedData('menu.colors.cardTitleColor', v)} />
        <ColorControl label={t('controls.cardText')} value={data?.menu?.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('menu.colors.cardText', v)} />
        <ColorControl label={t('controls.priceColor')} value={data?.menu?.colors?.priceColor || '#10b981'} onChange={(v) => setNestedData('menu.colors.priceColor', v)} />
        <ColorControl label={t('controls.borderColor')} value={data?.menu?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('menu.colors.borderColor', v)} />
      </div>


      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data?.menu?.paddingY || 'md'} onChange={(v) => setNestedData('menu.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data?.menu?.paddingX || 'md'} onChange={(v) => setNestedData('menu.paddingX', v)} />
        </div>
      </div>


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data?.menu?.cornerGradient?.enabled || false}
        position={data?.menu?.cornerGradient?.position || 'top-left'}
        color={data?.menu?.cornerGradient?.color || '#4f46e5'}
        opacity={data?.menu?.cornerGradient?.opacity || 30}
        size={data?.menu?.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('menu.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('menu.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('menu.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('menu.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('menu.cornerGradient.size', v)}
      />


      {/* Animation Controls */}
      <AnimationControls
        animationType={data?.menu?.animationType || 'fade-in-up'}
        enableCardAnimation={data?.menu?.enableCardAnimation !== false}
        onChangeAnimationType={(type) => setNestedData('menu.animationType', type)}
        onToggleAnimation={(enabled) => setNestedData('menu.enableCardAnimation', enabled)}
        label={t('editor.controls.common.cardAnimations')}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
