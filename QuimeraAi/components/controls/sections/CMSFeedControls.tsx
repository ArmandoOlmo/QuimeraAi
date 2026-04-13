/**
 * CMSFeedControls.tsx
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


export const renderCMSFeedControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  // Initialize cmsFeed data if not present
  const feedData = data?.cmsFeed || {} as any;

  const contentTab = (
    <div className="space-y-4">
      {/* Section Heading */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} />
          {t('controls.content')}
        </label>
        <Input label={t('editor.controls.common.title')} value={feedData.title || ''} onChange={(e) => setNestedData('cmsFeed.title', e.target.value)} placeholder="Latest Articles" />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={feedData.titleFontSize || 'md'} onChange={(v) => setNestedData('cmsFeed.titleFontSize', v)} />
        <TextArea label={t('editor.controls.common.description')} value={feedData.description || ''} onChange={(e) => setNestedData('cmsFeed.description', e.target.value)} rows={2} placeholder="Stay up to date with our latest content" />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={feedData.descriptionFontSize || 'md'} onChange={(v) => setNestedData('cmsFeed.descriptionFontSize', v)} />
      </div>

      {/* Layout Settings */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <LayoutGrid size={14} />
          {t('editor.controls.cmsFeed.layout')}
        </label>
        <Select
          label={t('editor.controls.cmsFeed.layoutVariant')}
          value={feedData.layout || 'grid'}
          onChange={(v) => setNestedData('cmsFeed.layout', v)}
          options={[
            { value: 'grid', label: t('editor.controls.cmsFeed.grid') },
            { value: 'list', label: t('editor.controls.cmsFeed.list') },
            { value: 'carousel', label: t('editor.controls.cmsFeed.carousel') },
            { value: 'magazine', label: t('editor.controls.cmsFeed.magazine') },
          ]}
        />
        {(feedData.layout || 'grid') === 'grid' && (
          <Select
            label={t('editor.controls.cmsFeed.columns')}
            value={String(feedData.columns || 3)}
            onChange={(v) => setNestedData('cmsFeed.columns', parseInt(v))}
            options={[
              { value: '1', label: `1 ${t('editor.controls.cmsFeed.column')}` },
              { value: '2', label: `2 ${t('editor.controls.cmsFeed.columns')}` },
              { value: '3', label: `3 ${t('editor.controls.cmsFeed.columns')}` },
              { value: '4', label: `4 ${t('editor.controls.cmsFeed.columns')}` },
            ]}
          />
        )}
        <Select
          label={t('editor.controls.cmsFeed.cardStyle')}
          value={feedData.cardStyle || 'classic'}
          onChange={(v) => setNestedData('cmsFeed.cardStyle', v)}
          options={[
            { value: 'classic', label: t('editor.controls.cmsFeed.classicStyle') },
            { value: 'overlay', label: t('editor.controls.cmsFeed.overlayStyle') },
            { value: 'minimal', label: t('editor.controls.cmsFeed.minimalStyle') },
            { value: 'compact', label: t('editor.controls.cmsFeed.compactStyle') },
            { value: 'editorial', label: t('editor.controls.cmsFeed.editorialStyle') },
          ]}
        />
        <Select
          label={t('editor.controls.cmsFeed.maxPosts')}
          value={String(feedData.maxPosts || 6)}
          onChange={(v) => setNestedData('cmsFeed.maxPosts', parseInt(v))}
          options={[
            { value: '3', label: t('editor.controls.cmsFeed.postsCount', { count: 3 }) },
            { value: '6', label: t('editor.controls.cmsFeed.postsCount', { count: 6 }) },
            { value: '9', label: t('editor.controls.cmsFeed.postsCount', { count: 9 }) },
            { value: '12', label: t('editor.controls.cmsFeed.postsCount', { count: 12 }) },
          ]}
        />
        <Select
          label={t('editor.controls.cmsFeed.categoryFilter')}
          value={feedData.categoryFilter || 'all'}
          onChange={(v) => setNestedData('cmsFeed.categoryFilter', v)}
          options={[
            { value: 'all', label: t('editor.controls.cmsFeed.allCategories') },
            ...(categories || []).map((cat: any) => ({ value: cat.id, label: cat.name }))
          ]}
        />
      </div>

      {/* Card Content Controls */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <SlidersHorizontal size={14} />
          {t('editor.controls.cmsFeed.cardContent')}
        </label>
        <ToggleControl
          label={t('editor.controls.cmsFeed.showFeaturedImage')}
          checked={feedData.showFeaturedImage !== false}
          onChange={(v) => setNestedData('cmsFeed.showFeaturedImage', v)}
        />
        <ToggleControl
          label={t('editor.controls.cmsFeed.showExcerpt')}
          checked={feedData.showExcerpt !== false}
          onChange={(v) => setNestedData('cmsFeed.showExcerpt', v)}
        />
        <ToggleControl
          label={t('editor.controls.cmsFeed.showDate')}
          checked={feedData.showDate !== false}
          onChange={(v) => setNestedData('cmsFeed.showDate', v)}
        />
        <ToggleControl
          label={t('editor.controls.cmsFeed.showAuthor')}
          checked={feedData.showAuthor !== false}
          onChange={(v) => setNestedData('cmsFeed.showAuthor', v)}
        />
        <ToggleControl
          label={t('editor.controls.cmsFeed.showCategoryBadge')}
          checked={feedData.showCategoryBadge !== false}
          onChange={(v) => setNestedData('cmsFeed.showCategoryBadge', v)}
        />
        <ToggleControl
          label={t('editor.controls.cmsFeed.showReadMore')}
          checked={feedData.showReadMore !== false}
          onChange={(v) => setNestedData('cmsFeed.showReadMore', v)}
        />
        {feedData.showReadMore !== false && (
          <Input
            label={t('editor.controls.cmsFeed.readMoreText')}
            value={feedData.readMoreText || 'Read More'}
            onChange={(e) => setNestedData('cmsFeed.readMoreText', e.target.value)}
          />
        )}
        <ToggleControl
          label={t('editor.controls.cmsFeed.showOnlyPublished')}
          checked={feedData.showOnlyPublished !== false}
          onChange={(v) => setNestedData('cmsFeed.showOnlyPublished', v)}
        />
      </div>

      {/* View All CTA */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <MousePointerClick size={14} />
          {t('editor.controls.cmsFeed.viewAllCta')}
        </label>
        <Input label={t('editor.controls.cmsFeed.buttonText')} value={feedData.viewAllText || ''} onChange={(e) => setNestedData('cmsFeed.viewAllText', e.target.value)} placeholder="View All Articles" />
        <Input label={t('editor.controls.cmsFeed.buttonLink')} value={feedData.viewAllLink || ''} onChange={(e) => setNestedData('cmsFeed.viewAllLink', e.target.value)} placeholder="/blog" />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="cmsFeed" data={data} setNestedData={setNestedData} />
      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.cmsFeed.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label="Vertical" value={feedData.paddingY || 'md'} onChange={(v) => setNestedData('cmsFeed.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={feedData.paddingX || 'md'} onChange={(v) => setNestedData('cmsFeed.paddingX', v)} />
        </div>
      </div>

      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.cmsFeed.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={feedData.colors?.background || '#0f172a'} onChange={(v) => setNestedData('cmsFeed.colors.background', v)} />
        <ColorControl label={t('editor.controls.cmsFeed.sectionTitle')} value={feedData.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('cmsFeed.colors.heading', v)} />
        <ColorControl label={t('editor.controls.cmsFeed.sectionDescription')} value={feedData.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('cmsFeed.colors.text', v)} />
      </div>

      {/* Card Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.cmsFeed.cardColors')}</label>
        <ColorControl label={t('editor.controls.cmsFeed.cardBackground')} value={feedData.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('cmsFeed.colors.cardBackground', v)} />
        <ColorControl label={t('editor.controls.cmsFeed.cardBorder')} value={feedData.colors?.cardBorder || '#334155'} onChange={(v) => setNestedData('cmsFeed.colors.cardBorder', v)} />
        <ColorControl label={t('editor.controls.cmsFeed.cardHeading')} value={feedData.colors?.cardHeading || '#f8fafc'} onChange={(v) => setNestedData('cmsFeed.colors.cardHeading', v)} />
        <ColorControl label={t('editor.controls.cmsFeed.cardText')} value={feedData.colors?.cardText || '#cbd5e1'} onChange={(v) => setNestedData('cmsFeed.colors.cardText', v)} />
        <ColorControl label={t('editor.controls.cmsFeed.cardExcerpt')} value={feedData.colors?.cardExcerpt || '#94a3b8'} onChange={(v) => setNestedData('cmsFeed.colors.cardExcerpt', v)} />
      </div>

      {/* Image Style */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.cmsFeed.imageStyle')}</label>
        <Select
          label={t('editor.controls.cmsFeed.cardImageShape')}
          value={feedData.imageStyle || 'rounded'}
          onChange={(v) => setNestedData('cmsFeed.imageStyle', v)}
          options={[
            { value: 'rounded', label: t('editor.controls.cmsFeed.rounded') },
            { value: 'square', label: t('editor.controls.cmsFeed.square') },
            { value: 'cover', label: t('editor.controls.cmsFeed.fullCover') },
          ]}
        />
      </div>

      {/* Category Badge Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.cmsFeed.categoryBadge')}</label>
        <ColorControl label={t('editor.controls.cmsFeed.badgeBackground')} value={feedData.colors?.categoryBadgeBackground || '#4f46e5'} onChange={(v) => setNestedData('cmsFeed.colors.categoryBadgeBackground', v)} />
        <ColorControl label={t('editor.controls.cmsFeed.badgeText')} value={feedData.colors?.categoryBadgeText || '#ffffff'} onChange={(v) => setNestedData('cmsFeed.colors.categoryBadgeText', v)} />
      </div>

      {/* Button Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.cmsFeed.buttons')}</label>
        <ColorControl label={t('editor.controls.cmsFeed.buttonBackground')} value={feedData.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('cmsFeed.colors.buttonBackground', v)} />
        <ColorControl label={t('editor.controls.common.buttonText')} value={feedData.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('cmsFeed.colors.buttonText', v)} />
      </div>

      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={feedData.cornerGradient?.enabled || false}
        position={feedData.cornerGradient?.position || 'top-left'}
        color={feedData.cornerGradient?.color || '#ffffff'}
        opacity={feedData.cornerGradient?.opacity || 20}
        size={feedData.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('cmsFeed.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('cmsFeed.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('cmsFeed.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('cmsFeed.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('cmsFeed.cornerGradient.size', v)}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
