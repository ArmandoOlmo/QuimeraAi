/**
 * PortfolioControls.tsx
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


export const renderPortfolioControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.portfolio) return null;
  const currentPortfolioVariant = (data?.portfolio as any)?.portfolioVariant || 'classic';

  const contentTab = (
    <div className="space-y-4">
      {/* Style Variant */}
      <div>
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Portfolio Style</label>
        <div className="grid grid-cols-2 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
          <button
            onClick={() => setNestedData('portfolio.portfolioVariant', 'classic')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentPortfolioVariant === 'classic' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
          >
            Classic
          </button>
          <button
            onClick={() => setNestedData('portfolio.portfolioVariant', 'image-overlay')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentPortfolioVariant === 'image-overlay' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
          >
            Overlay
          </button>
        </div>
        <p className="text-xs text-editor-text-secondary mt-1">
          {currentPortfolioVariant === 'classic'
            ? '📦 Card-based grid layout'
            : '🖼️ Full-width images with text overlay'}
        </p>
      </div>

      {/* Overlay-specific controls */}
      {currentPortfolioVariant === 'image-overlay' && (
        <>
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Overlay Settings</label>
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Grid Columns</label>
            <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
              {[2, 3, 4].map(cols => (
                <button
                  key={cols}
                  onClick={() => setNestedData('portfolio.gridColumns', cols)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data?.portfolio as any)?.gridColumns === cols || (!((data?.portfolio as any)?.gridColumns) && cols === 3) ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                >
                  {cols}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Image Height</label>
              <span className="text-xs text-editor-text-primary">{(data?.portfolio as any)?.imageHeight || 300}px</span>
            </div>
            <input
              type="range" min="150" max="600" step="10"
              value={(data?.portfolio as any)?.imageHeight || 300}
              onChange={e => setNestedData('portfolio.imageHeight', parseInt(e.target.value, 10))}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Text Alignment</label>
            <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
              {(['left', 'center', 'right'] as const).map(align => (
                <button
                  key={align}
                  onClick={() => setNestedData('portfolio.overlayTextAlignment', align)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${(data?.portfolio as any)?.overlayTextAlignment === align || (!((data?.portfolio as any)?.overlayTextAlignment) && align === 'left') ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                >
                  {align === 'left' ? '⬅️ Left' : align === 'center' ? '↔️ Center' : '➡️ Right'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Show Section Header</label>
            <button
              onClick={() => setNestedData('portfolio.showSectionHeader', !((data?.portfolio as any)?.showSectionHeader !== false))}
              className={`relative w-10 h-5 rounded-full transition-colors ${(data?.portfolio as any)?.showSectionHeader !== false ? 'bg-editor-accent' : 'bg-editor-border'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data?.portfolio as any)?.showSectionHeader !== false ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </>
      )}


      {/* Title & Description */}
      <Input label={t('editor.controls.common.title')} value={data?.portfolio?.title} onChange={(e) => setNestedData('portfolio.title', e.target.value)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.portfolio?.titleFontSize || 'md'} onChange={(v) => setNestedData('portfolio.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data?.portfolio?.description} onChange={(e) => setNestedData('portfolio.description', e.target.value)} rows={2} />
      <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.portfolio?.descriptionFontSize || 'md'} onChange={(v) => setNestedData('portfolio.descriptionFontSize', v)} />


      {/* Projects */}
      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Projects</label>
      {(data?.portfolio?.items || []).map((item: any, index: number) => (
        <div key={index} className="bg-editor-bg p-3 rounded-lg border border-editor-border mb-3 group">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-editor-text-secondary">Project #{index + 1}</span>
            <button
              onClick={() => {
                const newItems = (data?.portfolio?.items || []).filter((_: any, i: number) => i !== index);
                setNestedData('portfolio.items', newItems);
              }}
              className="text-editor-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <input
            placeholder="Title"
            value={item.title}
            onChange={(e) => setNestedData(`portfolio.items.${index}.title`, e.target.value)}
            className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
          />
          <textarea
            placeholder="Description"
            value={item.description}
            onChange={(e) => setNestedData(`portfolio.items.${index}.description`, e.target.value)}
            rows={2}
            className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
          />
          <ImagePicker
            label={t('editor.controls.common.image')}
            value={item.imageUrl}
            onChange={(url) => setNestedData(`portfolio.items.${index}.imageUrl`, url)}
          />

          {/* Link Controls */}
          <div className="mt-3 pt-3 border-t border-editor-border/50">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Link</label>
            <input
              placeholder="Link Text (e.g. View Project)"
              value={item.linkText || ''}
              onChange={(e) => setNestedData(`portfolio.items.${index}.linkText`, e.target.value)}
              className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent mb-2"
            />
            <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1 mb-2">
              {[
                { value: 'manual', label: 'URL' },
                { value: 'product', label: 'Product' },
                { value: 'collection', label: 'Collection' },
                { value: 'content', label: 'Contenido' }
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setNestedData(`portfolio.items.${index}.linkType`, type.value)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(item.linkType || 'manual') === type.value
                    ? 'bg-editor-accent text-editor-bg'
                    : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {(item.linkType === 'manual' || !item.linkType) && (
              <>
                <input
                  placeholder="https://example.com or #section"
                  value={item.linkUrl || ''}
                  onChange={(e) => setNestedData(`portfolio.items.${index}.linkUrl`, e.target.value)}
                  className="w-full bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary focus:outline-none focus:border-editor-accent"
                />
                <p className="text-xs text-editor-text-secondary mt-1">
                  Use URLs for external links or # for page sections
                </p>
              </>
            )}
            {item.linkType === 'product' && (
              <SingleProductSelector
                storeId={activeProject?.id || ''}
                selectedProductId={item.linkUrl?.startsWith('/product/') ? item.linkUrl.split('/product/')[1] : undefined}
                onSelect={(id) => {
                  if (id) {
                    setNestedData(`portfolio.items.${index}.linkUrl`, `/product/${id}`);
                  } else {
                    setNestedData(`portfolio.items.${index}.linkUrl`, '');
                  }
                }}
                label={t('editor.controls.common.selectProduct')}
              />
            )}
            {item.linkType === 'collection' && (
              <SingleCollectionSelector
                storeId={activeProject?.id || ''}
                gridCategories={data.categoryGrid?.categories || []}
                selectedCollectionId={(item as any).collectionId}
                onSelect={(id) => {
                  setNestedData(`portfolio.items.${index}.collectionId`, id || null);
                  if (id) {
                    setNestedData(`portfolio.items.${index}.linkUrl`, '');
                  }
                }}
                label={t('editor.controls.common.selectCollection')}
              />
            )}
            {item.linkType === 'content' && (
              <SingleContentSelector
                selectedContentPath={item.linkUrl}
                onSelect={(path) => {
                  setNestedData(`portfolio.items.${index}.linkUrl`, path || '');
                }}
                label={t('editor.controls.common.selectContent')}
              />
            )}
          </div>
        </div>
      ))}
      <button
        onClick={() => {
          const newItems = [...(data?.portfolio?.items || []), { title: 'New Project', description: 'Project description', imageUrl: 'pending:placeholder' }];
          setNestedData('portfolio.items', newItems);
        }}
        className="w-full px-4 py-2 rounded-md text-xs font-bold border border-dashed border-editor-accent/50 text-editor-accent hover:bg-editor-accent/10 transition-colors"
      >
        + Add Project
      </button>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="portfolio" />
      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.portfolio?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('portfolio.colors.background', v)} />
        <ColorControl label="Heading" value={data?.portfolio?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('portfolio.colors.heading', v)} />
        <ColorControl label="Text" value={data?.portfolio?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('portfolio.colors.text', v)} />
        <ColorControl label="Accent" value={data?.portfolio?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('portfolio.colors.accent', v)} />
      </div>


      {/* Card Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
        <ColorControl label="Card Background" value={data?.portfolio?.colors?.cardBackground || 'rgba(0,0,0,0.8)'} onChange={(v) => setNestedData('portfolio.colors.cardBackground', v)} />
        <ColorControl label="Card Title" value={data?.portfolio?.colors?.cardTitleColor || '#ffffff'} onChange={(v) => setNestedData('portfolio.colors.cardTitleColor', v)} />
        <ColorControl label="Card Text" value={data?.portfolio?.colors?.cardTextColor || 'rgba(255,255,255,0.9)'} onChange={(v) => setNestedData('portfolio.colors.cardTextColor', v)} />
        <ColorControl label="Border Color" value={data?.portfolio?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('portfolio.colors.borderColor', v)} />
      </div>


      {/* Card Overlay Gradient */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Overlay Gradient</label>
        <ColorControl label="Overlay Start (Bottom)" value={data?.portfolio?.colors?.cardOverlayStart || 'rgba(0,0,0,0.9)'} onChange={(v) => setNestedData('portfolio.colors.cardOverlayStart', v)} />
        <ColorControl label="Overlay End (Top)" value={data?.portfolio?.colors?.cardOverlayEnd || 'rgba(0,0,0,0.2)'} onChange={(v) => setNestedData('portfolio.colors.cardOverlayEnd', v)} />
      </div>


      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
        <div className="space-y-1">
          <PaddingSelector label="Vertical" value={data?.portfolio?.paddingY || 'md'} onChange={(v) => setNestedData('portfolio.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data?.portfolio?.paddingX || 'md'} onChange={(v) => setNestedData('portfolio.paddingX', v)} />
        </div>
      </div>


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data?.portfolio?.cornerGradient?.enabled || false}
        position={data?.portfolio?.cornerGradient?.position || 'top-left'}
        color={data?.portfolio?.cornerGradient?.color || '#4f46e5'}
        opacity={data?.portfolio?.cornerGradient?.opacity || 30}
        size={data?.portfolio?.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('portfolio.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('portfolio.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('portfolio.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('portfolio.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('portfolio.cornerGradient.size', v)}
      />


      {/* Animation Controls */}
      <AnimationControls
        animationType={data?.portfolio?.animationType || 'fade-in-up'}
        enableCardAnimation={data?.portfolio?.enableCardAnimation !== false}
        onChangeAnimationType={(type) => setNestedData('portfolio.animationType', type)}
        onToggleAnimation={(enabled) => setNestedData('portfolio.enableCardAnimation', enabled)}
        label={t('editor.controls.common.cardAnimations')}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
