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
import { Input, TextArea, I18nInput, I18nTextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector, SliderControl } from '../../ui/EditorControlPrimitives';
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
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} />
          {t('controls.content')}
        </label>
        <I18nInput label={t('editor.controls.common.title')} value={data?.cta.title} onChange={(val) => setNestedData('cta.title', val)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.cta.titleFontSize || 'md'} onChange={(v) => setNestedData('cta.titleFontSize', v)} />
        
        <div className="bg-q-surface/30 p-3 rounded-lg border border-q-border/50 my-3">
          <ToggleControl
            label={t('controls.mostrarAcento')}
            checked={data?.cta.showAccent !== false}
            onChange={(v) => setNestedData('cta.showAccent', v)}
          />
          {(data?.cta.showAccent !== false) && (
            <I18nInput 
              label={t('controls.textoDeAcento')} 
              value={data?.cta.accentText || 'Limited Time Offer'} 
              onChange={(val) => setNestedData('cta.accentText', val)} 
              className="mt-3 mb-0"
            />
          )}
        </div>

        <I18nTextArea label={t('editor.controls.common.description')} value={data?.cta.description} onChange={(val) => setNestedData('cta.description', val)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.cta.descriptionFontSize || 'md'} onChange={(v) => setNestedData('cta.descriptionFontSize', v)} />
        <I18nInput label={t('editor.controls.common.buttonText')} value={data?.cta.buttonText} onChange={(val) => setNestedData('cta.buttonText', val)} />
        <I18nInput label="Texto Secundario" value={data?.cta.secondaryText !== undefined ? data?.cta.secondaryText : 'No credit card required • Cancel anytime'} onChange={(val) => setNestedData('cta.secondaryText', val)} />
      </div>

      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Link size={14} />
          Link Type
        </label>
        <div className="flex bg-q-surface rounded-md border border-q-border p-1">
          {[
            { value: 'manual', label: 'Manual URL' },
            { value: 'product', label: 'Product' },
            { value: 'collection', label: 'Collection' },
            { value: 'content', label: 'Contenido' }
          ].map((type) => (
            <button type="button"               key={type.value}
              onClick={() => setNestedData('cta.linkType', type.value)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(data?.cta.linkType || 'manual') === type.value
                ? 'bg-q-accent text-q-bg'
                : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {(data?.cta.linkType === 'manual' || !data?.cta.linkType) && (
        <>
          <I18nInput
            label={t('editor.controls.common.buttonLink')}
            value={data?.cta.buttonUrl || ''}
            onChange={(val) => setNestedData('cta.buttonUrl', val)}
            placeholder="https://example.com or #section"
          />
          <p className="text-xs text-q-text-secondary -mt-2">
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
    <div className="space-y-4">      <BackgroundImageControl sectionKey="cta" data={data} setNestedData={setNestedData} />
      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data?.cta?.paddingY || 'md'} onChange={(v) => setNestedData('cta.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data?.cta?.paddingX || 'md'} onChange={(v) => setNestedData('cta.paddingX', v)} />
        </div>
      </div>


      {/* Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.colors')}</label>
        <ColorControl label={t('controls.sectionBackground')} value={data?.cta.colors?.background || '#0f172a'} onChange={(v) => setNestedData('cta.colors.background', v)} />
      </div>


      {/* Card Appearance */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.cardAppearance')}</label>
        
        <div className="mb-3">
          <ToggleControl
            label={t('controls.mostrarBorde')}
            checked={data?.cta.showCardBorder !== false}
            onChange={(v) => setNestedData('cta.showCardBorder', v)}
          />
        </div>

        <ColorControl label={t('controls.cardBorder')} value={data?.cta.colors?.borderColor || 'rgba(255,255,255,0.1)'} onChange={(v) => setNestedData('cta.colors.borderColor', v)} />
        <ColorControl label={t('controls.gradientStart')} value={data?.cta.colors?.gradientStart || '#000'} onChange={(v) => setNestedData('cta.colors.gradientStart', v)} />
        <ColorControl label={t('controls.gradientEnd')} value={data?.cta.colors?.gradientEnd || '#000'} onChange={(v) => setNestedData('cta.colors.gradientEnd', v)} />
        <div className="pt-2">
          <SliderControl
            label="Opacidad de Tarjeta"
            value={data?.cta.cardOpacity !== undefined ? data?.cta.cardOpacity : 100}
            onChange={(v) => setNestedData('cta.cardOpacity', v)}
            min={0} max={100} step={1} suffix="%"
          />
        </div>
      </div>


      {/* Text & Button */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.textButton')}</label>
        <ColorControl label={t('editor.controls.common.title')} value={data?.cta.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('cta.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.description')} value={data?.cta.colors?.text || '#ffffff'} onChange={(v) => setNestedData('cta.colors.text', v)} />
        <ColorControl label={t('controls.fondoBotn')} value={data?.cta.colors?.buttonBackground || '#ffffff'} onChange={(v) => setNestedData('cta.colors.buttonBackground', v)} />
        <ColorControl label={t('editor.controls.common.buttonText')} value={data?.cta.colors?.buttonText || '#4f46e5'} onChange={(v) => setNestedData('cta.colors.buttonText', v)} />
        <ColorControl label="Texto Secundario" value={data?.cta.colors?.secondaryText || 'rgba(255, 255, 255, 0.6)'} onChange={(v) => setNestedData('cta.colors.secondaryText', v)} />
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
