/**
 * CTAControls.tsx
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


export const renderCTAControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.cta) return null;

  const contentTab = (
    <div className="space-y-4">
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} />
          {t('controls.content')}
        </label>
        <Input label={t('editor.controls.common.title')} value={data?.cta.title} onChange={(e) => setNestedData('cta.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.cta.titleFontSize || 'md'} onChange={(v) => setNestedData('cta.titleFontSize', v)} />
        <TextArea label={t('editor.controls.common.description')} value={data?.cta.description} onChange={(e) => setNestedData('cta.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.cta.descriptionFontSize || 'md'} onChange={(v) => setNestedData('cta.descriptionFontSize', v)} />
        <Input label={t('editor.controls.common.buttonText')} value={data?.cta.buttonText} onChange={(e) => setNestedData('cta.buttonText', e.target.value)} />
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Link size={14} />
          Link Type
        </label>
        <div className="flex bg-editor-panel-bg rounded-md border border-editor-border p-1">
          {[
            { value: 'manual', label: 'Manual URL' },
            { value: 'product', label: 'Product' },
            { value: 'collection', label: 'Collection' },
            { value: 'content', label: 'Contenido' }
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => setNestedData('cta.linkType', type.value)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data?.cta.linkType || 'manual') === type.value
                ? 'bg-editor-accent text-editor-bg'
                : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-bg'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {(data?.cta.linkType === 'manual' || !data?.cta.linkType) && (
        <>
          <Input
            label={t('editor.controls.common.buttonLink')}
            value={data?.cta.buttonUrl || ''}
            onChange={(e) => setNestedData('cta.buttonUrl', e.target.value)}
            placeholder="https://example.com or #section"
          />
          <p className="text-xs text-editor-text-secondary -mt-2">
            Use URLs for external links or # for page sections (e.g., #contact)
          </p>
        </>
      )}

      {data?.cta.linkType === 'product' && (
        <SingleProductSelector
          storeId={activeProject?.id || ''}
          selectedProductId={data?.cta.buttonUrl?.startsWith('/product/') ? data?.cta.buttonUrl.split('/product/')[1] : undefined}
          onSelect={(id) => {
            if (id) {
              setNestedData('cta.buttonUrl', `/product/${id}`);
            } else {
              setNestedData('cta.buttonUrl', '');
            }
          }}
          label={t('editor.controls.common.selectProduct')}
        />
      )}

      {data?.cta.linkType === 'collection' && (
        <SingleCollectionSelector
          storeId={activeProject?.id || ''}
          gridCategories={data.categoryGrid?.categories || []}
          selectedCollectionId={data?.cta.collectionId}
          onSelect={(id) => {
            setNestedData('cta.collectionId', id || null);
            if (id) {
              setNestedData('cta.buttonUrl', '');
            }
          }}
          label={t('editor.controls.common.selectCollection')}
        />
      )}

      {data?.cta.linkType === 'content' && (
        <SingleContentSelector
          selectedContentPath={data?.cta.buttonUrl}
          onSelect={(path) => {
            setNestedData('cta.buttonUrl', path || '');
          }}
          label={t('editor.controls.common.selectContent')}
        />
      )}
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="cta" />
      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
        <div className="space-y-1">
          <PaddingSelector label="Vertical" value={data?.cta?.paddingY || 'md'} onChange={(v) => setNestedData('cta.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data?.cta?.paddingX || 'md'} onChange={(v) => setNestedData('cta.paddingX', v)} />
        </div>
      </div>


      {/* Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Colors</label>
        <ColorControl label="Section Background" value={data?.cta.colors?.background || '#0f172a'} onChange={(v) => setNestedData('cta.colors.background', v)} />
      </div>


      {/* Card Gradient */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Gradient</label>
        <ColorControl label="Gradient Start" value={data?.cta.colors?.gradientStart || '#000'} onChange={(v) => setNestedData('cta.colors.gradientStart', v)} />
        <ColorControl label="Gradient End" value={data?.cta.colors?.gradientEnd || '#000'} onChange={(v) => setNestedData('cta.colors.gradientEnd', v)} />
      </div>


      {/* Text & Button */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Text & Button</label>
        <ColorControl label={t('editor.controls.common.title')} value={data?.cta.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('cta.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.description')} value={data?.cta.colors?.text || '#ffffff'} onChange={(v) => setNestedData('cta.colors.text', v)} />
        <ColorControl label="Button Background" value={data?.cta.colors?.buttonBackground || '#ffffff'} onChange={(v) => setNestedData('cta.colors.buttonBackground', v)} />
        <ColorControl label={t('editor.controls.common.buttonText')} value={data?.cta.colors?.buttonText || '#4f46e5'} onChange={(v) => setNestedData('cta.colors.buttonText', v)} />
      </div>


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data?.cta?.cornerGradient?.enabled || false}
        position={data?.cta?.cornerGradient?.position || 'top-left'}
        color={data?.cta?.cornerGradient?.color || '#ffffff'}
        opacity={data?.cta?.cornerGradient?.opacity || 20}
        size={data?.cta?.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('cta.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('cta.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('cta.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('cta.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('cta.cornerGradient.size', v)}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
