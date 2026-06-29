/**
 * FAQControls.tsx
 * Section controls extracted from Controls.tsx
 */
import React, { useState, useRef } from 'react';

import ColorControl from '../../ui/ColorControl';
import CardPaddingControl from '../../ui/CardPaddingControl';
import ImagePicker from '../../ui/ImagePicker';
import IconSelector from '../../ui/IconSelector';
import AIFormControl from '../../ui/AIFormControl';
import TabbedControls from '../../ui/TabbedControls';
import AnimationControls from '../../ui/AnimationControls';
import SocialLinksEditor from '../../ui/SocialLinksEditor';
import { Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector , I18nInput, I18nTextArea} from '../../ui/EditorControlPrimitives';
import { BackgroundImageControl, CornerGradientControl, extractVideoId, ControlsDeps } from '../ControlsShared';
import {
  FAQ_IMAGE_VARIANTS,
  FAQ_VARIANT_GROUPS,
  getFaqVariantMeta,
  type FaqVariant,
} from '../../../data/faqVariants';
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


export const renderFAQControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.faq) return null;
  const currentVariant = (data.faq.faqVariant || 'classic') as FaqVariant;
  const currentMeta = getFaqVariantMeta(currentVariant);
  const variantUsesImage = FAQ_IMAGE_VARIANTS.includes(currentVariant);

  const contentTab = (
    <div className="space-y-4">
      {/* FAQ Variant Selector */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <Select
          label={t('controls.faqStyle')}
          value={currentVariant}
          onChange={(value) => setNestedData('faq.faqVariant', value)}
          groups={FAQ_VARIANT_GROUPS}
          noMargin
        />
        <p className="mt-2 text-[11px] text-q-text-secondary">{currentMeta.description}</p>
      </div>

      {variantUsesImage && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
          <ImagePicker
            label={t('editor.controls.common.image')}
            value={data.faq.imageUrl || data.faq.backgroundImageUrl}
            onChange={(url) => setNestedData('faq.imageUrl', url)}
          />
        </div>
      )}

      {/* FAQ Items */}
      {renderListSectionControls('faq', 'Question', [{ key: 'question', label: 'Question', type: 'input' }, { key: 'answer', label: 'Answer', type: 'textarea' }])}
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="faq" data={data} setNestedData={setNestedData} />
      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PaddingSelector label={t('controls.vertical')} value={data.faq.paddingY || 'md'} onChange={(v) => setNestedData('faq.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data.faq.paddingX || 'md'} onChange={(v) => setNestedData('faq.paddingX', v)} />
        </div>
        <CardPaddingControl value={data.faq} onChange={(key, value) => setNestedData(`faq.${key}`, value)} defaultValue={24} />
      </div>

      {/* Section Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.faq?.colors?.background || '#1e293b'} onChange={(v) => setNestedData('faq.colors.background', v)} />
        <ColorControl label={t('controls.sectionTitle')} value={data?.faq?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('faq.colors.heading', v)} />
        <ColorControl label={t('controls.sectionDescription')} value={data?.faq?.colors?.description || data?.faq?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('faq.colors.description', v)} />
        <ColorControl label={t('controls.accent')} value={data?.faq?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('faq.colors.accent', v)} />
      </div>


      {/* Card Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.cardColors')}</label>
        <ColorControl label={t('controls.cardBackground')} value={data?.faq?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('faq.colors.cardBackground', v)} />
        <ColorControl label={t('controls.questionText')} value={data?.faq?.colors?.text || '#F9FAFB'} onChange={(v) => setNestedData('faq.colors.text', v)} />
        <ColorControl label="Card Title" value={data?.faq?.colors?.cardHeading || data?.faq?.colors?.text || '#F9FAFB'} onChange={(v) => setNestedData('faq.colors.cardHeading', v)} />
        <ColorControl label="Card Text" value={data?.faq?.colors?.cardText || data?.faq?.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('faq.colors.cardText', v)} />
        <ColorControl label="Panel" value={data?.faq?.colors?.panelBackground || data?.faq?.colors?.cardBackground || '#111827'} onChange={(v) => setNestedData('faq.colors.panelBackground', v)} />
        <ColorControl label="Active" value={data?.faq?.colors?.activeBackground || data?.faq?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('faq.colors.activeBackground', v)} />
        <ColorControl label="Active Text" value={data?.faq?.colors?.activeText || data?.faq?.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('faq.colors.activeText', v)} />
        <ColorControl label="Icon Fill" value={data?.faq?.colors?.iconBackground || data?.faq?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('faq.colors.iconBackground', v)} />
        <ColorControl label={t('controls.borderColor')} value={data?.faq?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('faq.colors.borderColor', v)} />
      </div>

      {/* Gradient Colors (for gradient variant) */}
      {(['gradient', 'image-split', 'dark-panel', 'answer-panel', 'contact-card'] as string[]).includes(currentVariant) && (
        <>
          <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
            <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.gradient')}</label>
            <ColorControl label={t('controls.gradientStart')} value={data?.faq?.colors?.gradientStart || '#4f46e5'} onChange={(v) => setNestedData('faq.colors.gradientStart', v)} />
            <ColorControl label={t('controls.gradientEnd')} value={data?.faq?.colors?.gradientEnd || '#7c3aed'} onChange={(v) => setNestedData('faq.colors.gradientEnd', v)} />
          </div>
        </>
      )}
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
