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


export const renderPortfolioControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.portfolio) return null;
  const currentPortfolioVariant = (data?.portfolio as any)?.portfolioVariant || 'classic';

  const contentTab = (
    <div className="space-y-4">
      {/* Style Variant */}
      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.portfolioStyle')}</label>
        <div className="grid grid-cols-2 gap-1 bg-q-bg p-1 rounded-md border border-q-border">
          <button type="button"             onClick={() => setNestedData('portfolio.portfolioVariant', 'classic')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentPortfolioVariant === 'classic' ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
          >
            Classic
          </button>
          <button type="button"             onClick={() => setNestedData('portfolio.portfolioVariant', 'image-overlay')}
            className={`py-1 text-xs font-medium rounded-sm transition-colors ${currentPortfolioVariant === 'image-overlay' ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
          >
            Overlay
          </button>
        </div>
        <p className="text-xs text-q-text-secondary mt-1">
          {currentPortfolioVariant === 'classic'
            ? '📦 Card-based grid layout'
            : '🖼️ Full-width images with text overlay'}
        </p>
      </div>

      {/* Layout Settings (Available for all variants) */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.columnsCardWidth')}</label>
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
          {[2, 3, 4].map(cols => (
            <button type="button"               key={cols}
              onClick={() => setNestedData('portfolio.gridColumns', cols)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data?.portfolio as any)?.gridColumns === cols || (!((data?.portfolio as any)?.gridColumns) && cols === 3) ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
            >
              {cols}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <SliderControl
          label={t('controls.cardHeight')}
          value={(data?.portfolio as any)?.imageHeight || 400}
          onChange={(v) => setNestedData('portfolio.imageHeight', v)}
          min={150} max={800} step={10} suffix="px"
        />
      </div>

      {/* Classic-specific controls */}
      {currentPortfolioVariant === 'classic' && (
        <div className="mb-4 space-y-3 bg-q-bg p-3 rounded-lg border border-q-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-1">{t('controls.bottomGradient')}</label>
            <button type="button"               onClick={() => setNestedData('portfolio.showCardGradient', !((data?.portfolio as any)?.showCardGradient !== false))}
              className={`relative w-10 h-5 rounded-full transition-colors ${(data?.portfolio as any)?.showCardGradient !== false ? 'bg-q-accent' : 'bg-q-surface-overlay'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data?.portfolio as any)?.showCardGradient !== false ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-1">{t('controls.cardBorders')}</label>
            <button type="button"               onClick={() => setNestedData('portfolio.showCardBorder', !((data?.portfolio as any)?.showCardBorder !== false))}
              className={`relative w-10 h-5 rounded-full transition-colors ${(data?.portfolio as any)?.showCardBorder !== false ? 'bg-q-accent' : 'bg-q-surface-overlay'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${(data?.portfolio as any)?.showCardBorder !== false ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Overlay-specific controls */}
      {currentPortfolioVariant === 'image-overlay' && (
        <>
          <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.overlaySettings')}</label>
          <div>
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.textAlignment')}</label>
            <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
              {(['left', 'center', 'right'] as const).map(align => (
                <button type="button"                   key={align}
                  onClick={() => setNestedData('portfolio.overlayTextAlignment', align)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${(data?.portfolio as any)?.overlayTextAlignment === align || (!((data?.portfolio as any)?.overlayTextAlignment) && align === 'left') ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
                >
                  {align === 'left' ? '⬅️ Left' : align === 'center' ? '↔️ Center' : '➡️ Right'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.showSectionHeader')}</label>
            <button type="button"               onClick={() => setNestedData('portfolio.showSectionHeader', !((data?.portfolio as any)?.showSectionHeader !== false))}
              className={`relative w-10 h-5 rounded-full transition-colors ${(data?.portfolio as any)?.showSectionHeader !== false ? 'bg-q-accent' : 'bg-q-surface-overlay'}`}
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
      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.projects')}</label>
      {(data?.portfolio?.items || []).map((item: any, index: number) => (
        <div key={index} className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 group">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-q-text-secondary">Project #{index + 1}</span>
            <button type="button"               onClick={() => {
                const newItems = (data?.portfolio?.items || []).filter((_: any, i: number) => i !== index);
                setNestedData('portfolio.items', newItems);
              }}
              className="text-q-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <input
            placeholder="Title"
            value={item.title}
            onChange={(e) => setNestedData(`portfolio.items.${index}.title`, e.target.value)}
            className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mb-2"
          />
          <textarea
            placeholder="Description"
            value={item.description}
            onChange={(e) => setNestedData(`portfolio.items.${index}.description`, e.target.value)}
            rows={2}
            className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mb-2"
          />
          <ImagePicker
            label={t('editor.controls.common.image')}
            value={item.imageUrl}
            onChange={(url) => setNestedData(`portfolio.items.${index}.imageUrl`, url)}
          />

          {/* Link Controls */}
          <div className="mt-3 pt-3 border-t border-q-border/50">
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.link')}</label>
            <input
              placeholder="Link Text (e.g. View Project)"
              value={item.linkText || ''}
              onChange={(e) => setNestedData(`portfolio.items.${index}.linkText`, e.target.value)}
              className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mb-2"
            />
            <div className="flex bg-q-surface rounded-md border border-q-border p-1 mb-2">
              {[
                { value: 'manual', label: 'URL' },
                { value: 'product', label: 'Product' },
                { value: 'collection', label: 'Collection' },
                { value: 'content', label: 'Contenido' }
              ].map((type) => (
                <button type="button"                   key={type.value}
                  onClick={() => setNestedData(`portfolio.items.${index}.linkType`, type.value)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(item.linkType || 'manual') === type.value
                    ? 'bg-q-accent text-q-bg'
                    : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
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
                  className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent"
                />
                <p className="text-xs text-q-text-secondary mt-1">
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
      <button type="button"         onClick={() => {
          const newItems = [...(data?.portfolio?.items || []), { title: 'New Project', description: 'Project description', imageUrl: 'pending:placeholder' }];
          setNestedData('portfolio.items', newItems);
        }}
        className="w-full px-4 py-2 rounded-md text-xs font-bold border border-dashed border-q-accent/50 text-q-accent hover:bg-q-accent/10 transition-colors"
      >
        + Add Project
      </button>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="portfolio" data={data} setNestedData={setNestedData} />
      {/* Section Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.portfolio?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('portfolio.colors.background', v)} />
        <ColorControl label={t('controls.heading')} value={data?.portfolio?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('portfolio.colors.heading', v)} />
        <ColorControl label={t('controls.text')} value={data?.portfolio?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('portfolio.colors.text', v)} />
        <ColorControl label={t('controls.accent')} value={data?.portfolio?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('portfolio.colors.accent', v)} />
      </div>


      {/* Card Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.cardColors')}</label>
        <ColorControl label={t('controls.cardBackground')} value={data?.portfolio?.colors?.cardBackground || 'rgba(0,0,0,0.8)'} onChange={(v) => setNestedData('portfolio.colors.cardBackground', v)} />
        <ColorControl label={t('controls.cardTitle')} value={data?.portfolio?.colors?.cardTitleColor || '#ffffff'} onChange={(v) => setNestedData('portfolio.colors.cardTitleColor', v)} />
        <ColorControl label={t('controls.cardText')} value={data?.portfolio?.colors?.cardTextColor || 'rgba(255,255,255,0.9)'} onChange={(v) => setNestedData('portfolio.colors.cardTextColor', v)} />
        
        <div className="pt-2 mt-2 border-t border-q-border/50">
          <ToggleControl
            label={t('controls.mostrarBorde')}
            checked={data?.portfolio?.showCardBorder !== false}
            onChange={(v) => setNestedData('portfolio.showCardBorder', v)}
          />
          {data?.portfolio?.showCardBorder !== false && (
            <div className="mt-3 space-y-3">
              <ColorControl label={t('controls.borderColor')} value={data?.portfolio?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('portfolio.colors.borderColor', v)} />
                <SliderControl
                  label={t('controls.grosorDelBorde')}
                  value={(data?.portfolio as any)?.cardBorderWidth || 1}
                  onChange={(v) => setNestedData('portfolio.cardBorderWidth', v)}
                  min={1} max={10} step={1} suffix="px"
                />
            </div>
          )}
        </div>
      </div>


      {/* Card Overlay Gradient */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.cardOverlayGradient')}</label>
        <ToggleControl
          label={t('controls.mostrarDegradadoInferior')}
          checked={data?.portfolio?.showCardGradient !== false}
          onChange={(v) => setNestedData('portfolio.showCardGradient', v)}
        />
        {data?.portfolio?.showCardGradient !== false && (
          <div className="mt-3 space-y-2">
            <ColorControl label={t('controls.overlayStartBottom')} value={data?.portfolio?.colors?.cardOverlayStart || 'rgba(0,0,0,0.9)'} onChange={(v) => setNestedData('portfolio.colors.cardOverlayStart', v)} />
            <ColorControl label={t('controls.overlayEndTop')} value={data?.portfolio?.colors?.cardOverlayEnd || 'rgba(0,0,0,0.2)'} onChange={(v) => setNestedData('portfolio.colors.cardOverlayEnd', v)} />
          </div>
        )}
      </div>


      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data?.portfolio?.paddingY || 'md'} onChange={(v) => setNestedData('portfolio.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data?.portfolio?.paddingX || 'md'} onChange={(v) => setNestedData('portfolio.paddingX', v)} />
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
