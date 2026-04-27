/**
 * NewsletterControls.tsx
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


export const renderNewsletterControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.newsletter) return null;

  const contentTab = (
    <div className="space-y-4">
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} />
          {t('controls.content')}
        </label>
        <Input label={t('editor.controls.common.title')} value={data?.newsletter.title} onChange={(e) => setNestedData('newsletter.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.newsletter.titleFontSize || 'md'} onChange={(v) => setNestedData('newsletter.titleFontSize', v)} />
        <TextArea label={t('editor.controls.common.description')} value={data?.newsletter.description} onChange={(e) => setNestedData('newsletter.description', e.target.value)} rows={2} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.newsletter.descriptionFontSize || 'md'} onChange={(v) => setNestedData('newsletter.descriptionFontSize', v)} />
        <Input label={t('editor.controls.common.buttonText')} value={data?.newsletter.buttonText} onChange={(e) => setNestedData('newsletter.buttonText', e.target.value)} />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="newsletter" data={data} setNestedData={setNestedData} />
      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data?.newsletter?.paddingY || 'md'} onChange={(v) => setNestedData('newsletter.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data?.newsletter?.paddingX || 'md'} onChange={(v) => setNestedData('newsletter.paddingX', v)} />
        </div>
      </div>


      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.newsletter.colors?.background || '#000000'} onChange={(v) => setNestedData('newsletter.colors.background', v)} />
        <ColorControl label={t('controls.sectionTitle')} value={data?.newsletter.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('newsletter.colors.heading', v)} />
        <ColorControl label={t('controls.sectionDescription')} value={data?.newsletter.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('newsletter.colors.text', v)} />
      </div>


      {/* Card Box */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.cardBox')}</label>
        
        <div className="mb-3">
          <ToggleControl
            label={t('controls.mostrarBorde')}
            checked={data?.newsletter.showCardBorder !== false}
            onChange={(v) => setNestedData('newsletter.showCardBorder', v)}
          />
        </div>

        <ColorControl label={t('controls.cardBackground')} value={data?.newsletter.colors?.cardBackground || 'rgba(79, 70, 229, 0.75)'} onChange={(v) => setNestedData('newsletter.colors.cardBackground', v)} />
        <ColorControl label={t('controls.cardBorder')} value={data?.newsletter.colors?.borderColor || '#374151'} onChange={(v) => setNestedData('newsletter.colors.borderColor', v)} />
        <ColorControl label={t('controls.cardHeading')} value={data?.newsletter.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.cardHeading', v)} />
        <ColorControl label={t('controls.cardText')} value={data?.newsletter.colors?.cardText || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.cardText', v)} />
        <div className="pt-2">
          <SliderControl
            label="Opacidad de Tarjeta"
            value={data?.newsletter.cardOpacity !== undefined ? data?.newsletter.cardOpacity : 100}
            onChange={(v) => setNestedData('newsletter.cardOpacity', v)}
            min={0} max={100} suffix="%"
          />
        </div>
      </div>


      {/* Input Field */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.inputField')}</label>
        <ColorControl label={t('controls.inputBackground')} value={data?.newsletter.colors?.inputBackground || '#111827'} onChange={(v) => setNestedData('newsletter.colors.inputBackground', v)} />
        <ColorControl label={t('controls.inputText')} value={data?.newsletter.colors?.inputText || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.inputText', v)} />
        <ColorControl label={t('controls.placeholder')} value={data?.newsletter.colors?.inputPlaceholder || '#6b7280'} onChange={(v) => setNestedData('newsletter.colors.inputPlaceholder', v)} />
        <ColorControl label={t('controls.inputBorder')} value={data?.newsletter.colors?.inputBorder || '#374151'} onChange={(v) => setNestedData('newsletter.colors.inputBorder', v)} />
      </div>


      {/* Button */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('controls.button')}</label>
        <ColorControl label={t('controls.fondoBotn')} value={data?.newsletter.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('newsletter.colors.buttonBackground', v)} />
        <ColorControl label={t('editor.controls.common.buttonText')} value={data?.newsletter.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('newsletter.colors.buttonText', v)} />
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
