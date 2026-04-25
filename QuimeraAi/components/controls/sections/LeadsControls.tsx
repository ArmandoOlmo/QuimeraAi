/**
 * LeadsControls.tsx
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


export const renderLeadsControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.leads) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Variant Selector */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layout size={14} />
          Estilo de Formulario
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'classic', label: 'Clásico' },
            { value: 'split-gradient', label: 'Gradiente Dividido' },
            { value: 'floating-glass', label: 'Vidrio Flotante' },
            { value: 'minimal-border', label: 'Borde Minimalista' }
          ].map((variant) => (
            <button type="button"               key={variant.value}
              onClick={() => setNestedData('leads.leadsVariant', variant.value)}
              className={`p-3 text-xs font-medium rounded-md border-2 transition-all ${(data?.leads?.leadsVariant || 'classic') === variant.value
                ? 'bg-editor-accent text-editor-bg border-editor-accent'
                : 'bg-editor-panel-bg text-editor-text-secondary border-editor-border hover:border-editor-accent'
                }`}
            >
              {variant.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} />
          {t('controls.content')}
        </label>
        <Input label={t('editor.controls.common.title')} value={data?.leads.title} onChange={(e) => setNestedData('leads.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.leads.titleFontSize || 'md'} onChange={(v) => setNestedData('leads.titleFontSize', v)} />
        <TextArea label={t('editor.controls.common.description')} value={data?.leads.description} onChange={(e) => setNestedData('leads.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.leads.descriptionFontSize || 'md'} onChange={(v) => setNestedData('leads.descriptionFontSize', v)} />
        <Input label={t('editor.controls.common.buttonText')} value={data?.leads.buttonText} onChange={(e) => setNestedData('leads.buttonText', e.target.value)} />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t('controls.glassmorphismTransparencia')}
          checked={data?.leads?.glassEffect || false}
          onChange={(v) => setNestedData('leads.glassEffect', v)}
        />
      </div>
      <BackgroundImageControl sectionKey="leads" data={data} setNestedData={setNestedData} />
      {/* Border Radius Controls */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.borderRadius')}</label>
        <BorderRadiusSelector label={t('controls.cardRadius')} value={data?.leads?.cardBorderRadius || 'xl'} onChange={(v) => setNestedData('leads.cardBorderRadius', v)} />
        <BorderRadiusSelector label={t('controls.inputRadius')} value={data?.leads?.inputBorderRadius || 'md'} onChange={(v) => setNestedData('leads.inputBorderRadius', v)} />
        <BorderRadiusSelector label={t('controls.buttonRadius')} value={data?.leads?.buttonBorderRadius || 'md'} onChange={(v) => setNestedData('leads.buttonBorderRadius', v)} />
      </div>


      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data?.leads?.paddingY || 'md'} onChange={(v) => setNestedData('leads.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data?.leads?.paddingX || 'md'} onChange={(v) => setNestedData('leads.paddingX', v)} />
        </div>
      </div>


      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.leads.colors?.background || '#0f172a'} onChange={(v) => setNestedData('leads.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data?.leads.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('leads.colors.heading', v)} />
        <ColorControl label={t('editor.controls.common.subtitle')} value={data?.leads.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('leads.colors.description', v)} />
        <ColorControl label={t('controls.accent')} value={data?.leads.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('leads.colors.accent', v)} />


        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data?.leads?.cornerGradient?.enabled || false}
          position={data?.leads?.cornerGradient?.position || 'top-left'}
          color={data?.leads?.cornerGradient?.color || '#4f46e5'}
          opacity={data?.leads?.cornerGradient?.opacity || 30}
          size={data?.leads?.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('leads.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('leads.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('leads.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('leads.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('leads.cornerGradient.size', v)}
        />
      </div>


      {/* Card Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.cardColors')}</label>
        <ColorControl label={t('controls.cardBackground')} value={data?.leads.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('leads.colors.cardBackground', v)} />
        <ColorControl label={t('controls.labelText')} value={data?.leads.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('leads.colors.text', v)} />
        <ColorControl label={t('controls.borderColor')} value={data?.leads.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('leads.colors.borderColor', v)} />
      </div>


      {/* Input Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.inputColors')}</label>
        <ColorControl label={t('controls.inputBackground')} value={data?.leads.colors?.inputBackground || '#0f172a'} onChange={(v) => setNestedData('leads.colors.inputBackground', v)} />
        <ColorControl label={t('controls.inputText')} value={data?.leads.colors?.inputText || '#F9FAFB'} onChange={(v) => setNestedData('leads.colors.inputText', v)} />
        <ColorControl label={t('controls.placeholder')} value={data?.leads.colors?.inputPlaceholder || '#6b7280'} onChange={(v) => setNestedData('leads.colors.inputPlaceholder', v)} />
        <ColorControl label={t('controls.inputBorder')} value={data?.leads.colors?.inputBorder || '#334155'} onChange={(v) => setNestedData('leads.colors.inputBorder', v)} />
      </div>


      {/* Button & Gradient Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.buttonGradient')}</label>
        <ColorControl label={t('controls.fondoBotn')} value={data?.leads.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('leads.colors.buttonBackground', v)} />
        <ColorControl label={t('editor.controls.common.buttonText')} value={data?.leads.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('leads.colors.buttonText', v)} />
        <ColorControl label={t('controls.gradientStart')} value={data?.leads.colors?.gradientStart || '#4f46e5'} onChange={(v) => setNestedData('leads.colors.gradientStart', v)} />
        <ColorControl label={t('controls.gradientEnd')} value={data?.leads.colors?.gradientEnd || '#10b981'} onChange={(v) => setNestedData('leads.colors.gradientEnd', v)} />
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
