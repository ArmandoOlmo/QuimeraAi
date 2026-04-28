/**
 * HowItWorksControls.tsx
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


export const renderHowItWorksControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.howItWorks) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Content */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} />
          {t('controls.content')}
        </label>
        <Input label={t('editor.controls.common.title')} value={data?.howItWorks?.title} onChange={(e) => setNestedData('howItWorks.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.howItWorks?.titleFontSize || 'md'} onChange={(v) => setNestedData('howItWorks.titleFontSize', v)} />
        <TextArea label={t('editor.controls.common.description')} value={data?.howItWorks?.description} onChange={(e) => setNestedData('howItWorks.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.howItWorks?.descriptionFontSize || 'md'} onChange={(v) => setNestedData('howItWorks.descriptionFontSize', v)} />
      </div>

      {/* Steps */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <SlidersHorizontal size={14} />
          Steps
        </label>
        {/* Steps Count */}
        <div className="mb-3">
          <Select
            label={t('controls.stepsCount')}
            value={String(data?.howItWorks?.steps || 3)}
            onChange={(val) => setNestedData('howItWorks.steps', parseInt(val))}
            options={[
              { value: '3', label: '3 Steps' },
              { value: '4', label: '4 Steps' },
            ]}
            noMargin
          />
        </div>
      {(data?.howItWorks?.items || []).map((item: any, index: number) => (
        <div key={index} className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 group">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-q-text-secondary">Step #{index + 1}</span>
            <button type="button"               onClick={() => {
                const newItems = (data?.howItWorks?.items || []).filter((_: any, i: number) => i !== index);
                setNestedData('howItWorks.items', newItems);
              }}
              className="text-q-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <input
            placeholder="Title"
            value={item.title}
            onChange={(e) => setNestedData(`howItWorks.items.${index}.title`, e.target.value)}
            className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mb-2"
          />
          <textarea
            placeholder="Description"
            value={item.description}
            onChange={(e) => setNestedData(`howItWorks.items.${index}.description`, e.target.value)}
            rows={2}
            className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mb-2"
          />
          <Select
            value={item.icon}
            onChange={(val) => setNestedData(`howItWorks.items.${index}.icon`, val)}
            options={['upload', 'process', 'magic-wand', 'download', 'share', 'search'].map(opt => ({ value: opt, label: opt }))}
            noMargin
          />
        </div>
      ))}
      <button type="button"         onClick={() => {
          const newItems = [...(data?.howItWorks?.items || []), { title: 'New Step', description: 'Step description', icon: 'upload' }];
          setNestedData('howItWorks.items', newItems);
        }}
        className="w-full py-2 border-2 border-dashed border-q-border rounded-lg text-q-text-secondary hover:border-q-accent hover:text-q-accent transition-colors text-sm"
      >
        + Add Step
      </button>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="howItWorks" data={data} setNestedData={setNestedData} />
      {/* Section Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.howItWorks?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('howItWorks.colors.background', v)} />
        <ColorControl label={t('controls.sectionTitle')} value={data?.howItWorks?.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('howItWorks.colors.heading', v)} />
        <ColorControl label={t('controls.sectionDescription')} value={data?.howItWorks?.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('howItWorks.colors.description', v)} />
      </div>


      {/* Step Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.stepColors')}</label>
        <ColorControl label={t('controls.circleBackground')} value={data?.howItWorks?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('howItWorks.colors.accent', v)} />
        <ColorControl label={t('controls.iconColor')} value={data?.howItWorks?.colors?.iconColor || '#ffffff'} onChange={(v) => setNestedData('howItWorks.colors.iconColor', v)} />
        <ColorControl label={t('controls.stepTitle')} value={data?.howItWorks?.colors?.stepTitle || '#ffffff'} onChange={(v) => setNestedData('howItWorks.colors.stepTitle', v)} />
        <ColorControl label={t('controls.stepDescription')} value={data?.howItWorks?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('howItWorks.colors.text', v)} />
      </div>


      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data?.howItWorks?.paddingY || 'md'} onChange={(v) => setNestedData('howItWorks.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data?.howItWorks?.paddingX || 'md'} onChange={(v) => setNestedData('howItWorks.paddingX', v)} />
        </div>
      </div>


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data?.howItWorks?.cornerGradient?.enabled || false}
        position={data?.howItWorks?.cornerGradient?.position || 'top-left'}
        color={data?.howItWorks?.cornerGradient?.color || '#4f46e5'}
        opacity={data?.howItWorks?.cornerGradient?.opacity || 30}
        size={data?.howItWorks?.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('howItWorks.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('howItWorks.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('howItWorks.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('howItWorks.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('howItWorks.cornerGradient.size', v)}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
