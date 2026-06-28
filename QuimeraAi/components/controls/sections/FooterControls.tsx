/**
 * FooterControls.tsx
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
import {
  Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector
, I18nInput, I18nTextArea} from '../../ui/EditorControlPrimitives';
import { BackgroundImageControl, CornerGradientControl, extractVideoId, ControlsDeps, CardGlowControl } from '../ControlsShared';
import { FOOTER_IMAGE_VARIANTS, FOOTER_VARIANT_GROUPS, FOOTER_WORDMARK_VARIANTS, getFooterVariantMeta } from '../../../data/footerVariants';
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


export const renderFooterControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.footer) return null;
  const currentFooterVariant = data.footer.footerVariant || 'classic';
  const currentFooterVariantMeta = getFooterVariantMeta(currentFooterVariant);

  return (
    <div className="space-y-4">
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layout size={14} /> Footer Variant
        </label>
        <Select
          value={currentFooterVariant}
          onChange={(val) => setNestedData('footer.footerVariant', val)}
          groups={FOOTER_VARIANT_GROUPS}
          noMargin
        />
        <p className="text-xs text-q-text-secondary">{currentFooterVariantMeta.description}</p>
      </div>

      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t("controls.glassmorphismTransparencia", "Glassmorphism Background")}
          checked={data?.footer?.glassEffect || false}
          onChange={(v) => setNestedData("footer.glassEffect", v)}
        />
      </div>

      {/* Logo Type Selector */}
      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.logoType')}</label>
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
          {['text', 'image'].map(type => (
            <button type="button"               key={type}
              onClick={() => setNestedData('footer.logoType', type)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.footer.logoType || 'text') === type
                ? 'bg-q-accent text-q-bg'
                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Logo Image Upload - only shown when logoType is 'image' */}
      {data.footer.logoType === 'image' && (
        <ImagePicker
          label={t('editor.controls.common.logoImage')}
          value={data.footer.logoImageUrl || ''}
          onChange={(url) => setNestedData('footer.logoImageUrl', url)}
        />
      )}

      <I18nInput label={t('editor.controls.common.title')} value={data.footer.title} onChange={(val) => setNestedData('footer.title', val)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.footer.titleFontSize || 'sm'} onChange={(v) => setNestedData('footer.titleFontSize', v)} />

      <I18nTextArea label={t('editor.controls.common.description')} value={data.footer.description} onChange={(val) => setNestedData('footer.description', val)} rows={2} />
      <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.footer.descriptionFontSize || 'sm'} onChange={(v) => setNestedData('footer.descriptionFontSize', v)} />

      <I18nInput label={t('editor.controls.common.copyright')} value={data.footer.copyrightText} onChange={(val) => setNestedData('footer.copyrightText', val)} />
      <div className="space-y-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.linkColumns')}</label>
        {(data.footer.linkColumns || []).map((col, colIndex) => (
          <div key={colIndex} className="bg-q-bg p-3 rounded border border-q-border space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <I18nInput placeholder="Column Title" value={col.title} onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.title`, val)} className="flex-1 mb-0" />
              <button type="button" onClick={() => {
                const newCols = (data.footer.linkColumns || []).filter((_, i) => i !== colIndex);
                setNestedData('footer.linkColumns', newCols);
              }} className="text-red-400 hover:text-red-500 flex-shrink-0 hover:bg-red-500/10 rounded p-1 transition-colors"><Trash2 size={14} /></button>
            </div>

            {/* Menu Selector per Column */}
            <Select
              value={col.menuId || ''}
              onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.menuId`, val === '' ? undefined : val)}
              options={[
                { value: '', label: 'Manual Links' },
                ...menus.map(menu => ({ value: menu.id, label: menu.title })),
              ]}
              noMargin
            />

            {/* Conditional Link List */}
            {col.menuId ? (
              <p className="text-[10px] text-q-text-secondary italic">Using links from menu: {menus.find(m => m.id === col.menuId)?.title}</p>
            ) : (
              <>
                {(col.links || []).map((link, linkIndex) => (
                  <div key={linkIndex} className="flex gap-2 items-center mb-1">
                    <I18nInput placeholder="Text" value={link.text} onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.text`, val)} className="flex-1 mb-0" />
                    <I18nInput placeholder="Href" value={link.href} onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.href`, val)} className="flex-1 mb-0" />
                    <button type="button" onClick={() => {
                      const newLinks = (col.links || []).filter((_, i) => i !== linkIndex);
                      setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                    }} className="text-q-text-secondary hover:text-red-400 flex-shrink-0"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => {
                  const newLinks = [...(col.links || []), { text: 'New Link', href: '/' }];
                  setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                }} className="text-xs text-q-accent hover:underline mt-1">+ Add Link</button>
              </>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setNestedData('footer.linkColumns', [...(data.footer.linkColumns || []), { title: 'New Column', links: [] }])} className="w-full py-2 border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={14} /> Add Column</button>
      </div>
      <SocialLinksEditor
        socialLinks={data.footer.socialLinks}
        onUpdate={(newLinks) => setNestedData('footer.socialLinks', newLinks)}
        onUpdateHref={(index, href) => setNestedData(`footer.socialLinks.${index}.href`, href)}
      />


      {/* Contact Information */}
      <div className="space-y-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <MapPin size={14} className="text-q-accent" />
          Contact Information
        </label>
        <I18nInput
          label={t('editor.controls.common.address')}
          value={data.footer.contactInfo?.address || ''}
          onChange={(val) => setNestedData('footer.contactInfo.address', val)}
          placeholder="123 Main Street"
        />
        <div className="grid grid-cols-2 gap-2">
          <I18nInput
            label={t('editor.controls.common.city')}
            value={data.footer.contactInfo?.city || ''}
            onChange={(val) => setNestedData('footer.contactInfo.city', val)}
            placeholder="City"
          />
          <I18nInput
            label={t('editor.controls.common.state')}
            value={data.footer.contactInfo?.state || ''}
            onChange={(val) => setNestedData('footer.contactInfo.state', val)}
            placeholder="State"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <I18nInput
            label={t('editor.controls.common.zipCode')}
            value={data.footer.contactInfo?.zipCode || ''}
            onChange={(val) => setNestedData('footer.contactInfo.zipCode', val)}
            placeholder="12345"
          />
          <I18nInput
            label={t('editor.controls.common.country')}
            value={data.footer.contactInfo?.country || ''}
            onChange={(val) => setNestedData('footer.contactInfo.country', val)}
            placeholder="Country"
          />
        </div>
        <I18nInput
          label={t('editor.controls.common.phone')}
          value={data.footer.contactInfo?.phone || ''}
          onChange={(val) => setNestedData('footer.contactInfo.phone', val)}
          placeholder="+1 (555) 123-4567"
        />
        <I18nInput
          label={t('editor.controls.common.email')}
          value={data.footer.contactInfo?.email || ''}
          onChange={(val) => setNestedData('footer.contactInfo.email', val)}
          placeholder="contact@example.com"
        />
      </div>


      {/* Business Hours */}
      <div className="space-y-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <Clock size={14} className="text-q-accent" />
          Business Hours
        </label>

        {/* Quick copy buttons */}
        <div className="flex gap-2 flex-wrap">
          <button type="button"             onClick={() => {
              const businessHours = data.footer.contactInfo?.businessHours || {};
              const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
              const newHours: any = {};
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                newHours[day] = { ...monHours };
              });
              setNestedData('footer.contactInfo.businessHours', { ...businessHours, ...newHours });
            }}
            className="text-xs px-2 py-1 bg-q-accent/20 text-q-accent rounded hover:bg-q-accent/30 transition-colors"
          >
            Copy Mon → Weekdays
          </button>
          <button type="button"             onClick={() => {
              const businessHours = data.footer.contactInfo?.businessHours || {};
              const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
              const newHours: any = {};
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                newHours[day] = { ...monHours };
              });
              setNestedData('footer.contactInfo.businessHours', newHours);
            }}
            className="text-xs px-2 py-1 bg-q-accent/20 text-q-accent rounded hover:bg-q-accent/30 transition-colors"
          >
            Copy Mon → All Days
          </button>
        </div>

        {/* Days */}
        <div className="space-y-2 bg-q-bg p-3 rounded-lg border border-q-border">
          {[
            { key: 'monday', label: 'Mon' },
            { key: 'tuesday', label: 'Tue' },
            { key: 'wednesday', label: 'Wed' },
            { key: 'thursday', label: 'Thu' },
            { key: 'friday', label: 'Fri' },
            { key: 'saturday', label: 'Sat' },
            { key: 'sunday', label: 'Sun' },
          ].map(({ key, label }) => {
            // Safer access to potentially undefined nested objects
            const contactInfo = data.footer.contactInfo || {};
            const businessHours = contactInfo.businessHours || {};
            const dayHours = businessHours[key as keyof typeof businessHours] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };

            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-10 text-xs font-medium text-q-text-secondary">{label}</span>
                <button type="button"                   onClick={() => {
                    // When toggling, we need to handle the case where contactInfo or businessHours don't exist yet
                    if (!dayHours.isOpen) {
                      // Turning ON: Set the full object to ensure structure exists
                      setNestedData(`footer.contactInfo.businessHours.${key}`, {
                        isOpen: true,
                        openTime: dayHours.openTime || '09:00',
                        closeTime: dayHours.closeTime || '17:00'
                      });
                    } else {
                      // Turning OFF: Just update the flag
                      setNestedData(`footer.contactInfo.businessHours.${key}.isOpen`, false);
                    }
                  }}
                  className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${dayHours.isOpen ? 'bg-green-500' : 'bg-q-surface-overlay'
                    }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dayHours.isOpen ? 'left-5' : 'left-0.5'
                      }`}
                  />
                </button>
                {dayHours.isOpen ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="time"
                      value={dayHours.openTime || '09:00'}
                      onChange={(val) => setNestedData(`footer.contactInfo.businessHours.${key}.openTime`, val)}
                      className="w-[90px] bg-q-surface border border-q-border rounded px-1.5 py-0.5 text-xs text-q-text-primary"
                    />
                    <span className="text-q-text-secondary text-xs">-</span>
                    <input
                      type="time"
                      value={dayHours.closeTime || '17:00'}
                      onChange={(val) => setNestedData(`footer.contactInfo.businessHours.${key}.closeTime`, val)}
                      className="w-[90px] bg-q-surface border border-q-border rounded px-1.5 py-0.5 text-xs text-q-text-primary"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-q-text-secondary italic">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <ColorControl label={t('editor.controls.common.background')} value={data.footer.colors?.background} onChange={(v) => setNestedData('footer.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.footer.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('footer.colors.heading', v)} />
        <ColorControl label={t('controls.text')} value={data.footer.colors?.text} onChange={(v) => setNestedData('footer.colors.text', v)} />
        <ColorControl label={t('controls.accent', 'Accent')} value={data.footer.colors?.accent || data.footer.colors?.linkHover} onChange={(v) => setNestedData('footer.colors.accent', v)} />
        <ColorControl label={t('editor.controls.footer.wordmarkColor', 'Wordmark')} value={data.footer.colors?.wordmark || data.footer.colors?.heading} onChange={(v) => setNestedData('footer.colors.wordmark', v)} />
        <ColorControl label={t('editor.controls.footer.panelBackground', 'Panel background')} value={data.footer.colors?.panelBackground || data.footer.colors?.background} onChange={(v) => setNestedData('footer.colors.panelBackground', v)} />
      </div>
    </div>
  );
};

// ─── ─── ─── ─── ─── ─── ───

export const renderFooterControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.footer) return null;
  const currentFooterVariant = data.footer.footerVariant || 'classic';
  const currentFooterVariantMeta = getFooterVariantMeta(currentFooterVariant);
  const usesFooterImage = FOOTER_IMAGE_VARIANTS.includes(currentFooterVariant as any);
  const usesFooterWordmark = FOOTER_WORDMARK_VARIANTS.includes(currentFooterVariant as any);

  const contentTab = (
    <div className="space-y-4">
      {/* ========== LOGO ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image size={14} />
          Logo
        </label>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.logoType')}</label>
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
          {['text', 'image'].map(type => (
            <button type="button"               key={type}
              onClick={() => setNestedData('footer.logoType', type)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.footer.logoType || 'text') === type
                ? 'bg-q-accent text-q-bg'
                : 'text-q-text-secondary hover:bg-q-surface-overlay'
                }`}
            >
              {type}
            </button>
          ))}
        </div>

        {data.footer.logoType === 'image' && (
          <div className="mt-3">
            <ImagePicker
              label={t('editor.controls.common.logoImage')}
              value={data.footer.logoImageUrl || ''}
              onChange={(url) => setNestedData('footer.logoImageUrl', url)}
            />
          </div>
        )}
      </div>


      {/* ========== CONTENT ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          Contenido
        </label>
        <I18nInput label={t('editor.controls.common.title')} value={data.footer.title} onChange={(val) => setNestedData('footer.title', val)} />
        <I18nTextArea label={t('editor.controls.common.description')} value={data.footer.description} onChange={(val) => setNestedData('footer.description', val)} rows={2} />
        <I18nInput label={t('editor.controls.common.copyright')} value={data.footer.copyrightText} onChange={(val) => setNestedData('footer.copyrightText', val)} />
        {usesFooterWordmark && (
          <I18nInput
            label={t('editor.controls.footer.wordmarkText', 'Wordmark text')}
            value={data.footer.wordmarkText || ''}
            onChange={(val) => setNestedData('footer.wordmarkText', val)}
          />
        )}
        {['grid-newsletter', 'grid-wordmark'].includes(currentFooterVariant) && (
          <div className="grid grid-cols-1 gap-3">
            <I18nInput label={t('editor.controls.footer.newsletterLabel', 'Newsletter label')} value={data.footer.newsletterLabel || ''} onChange={(val) => setNestedData('footer.newsletterLabel', val)} />
            <I18nInput label={t('editor.controls.footer.newsletterPlaceholder', 'Newsletter placeholder')} value={data.footer.newsletterPlaceholder || ''} onChange={(val) => setNestedData('footer.newsletterPlaceholder', val)} />
            <I18nInput label={t('editor.controls.footer.newsletterButton', 'Newsletter button')} value={data.footer.newsletterButtonText || ''} onChange={(val) => setNestedData('footer.newsletterButtonText', val)} />
          </div>
        )}
        {currentFooterVariant === 'cta-card' && (
          <div className="space-y-3">
            <I18nInput label={t('editor.controls.footer.ctaTitle', 'CTA title')} value={data.footer.ctaTitle || ''} onChange={(val) => setNestedData('footer.ctaTitle', val)} />
            <I18nInput label={t('editor.controls.footer.primaryButton', 'Primary button')} value={data.footer.primaryButtonText || ''} onChange={(val) => setNestedData('footer.primaryButtonText', val)} />
            <I18nInput label={t('editor.controls.footer.secondaryButton', 'Secondary button')} value={data.footer.secondaryButtonText || ''} onChange={(val) => setNestedData('footer.secondaryButtonText', val)} />
          </div>
        )}
        {['press-landscape', 'compliance-wordmark'].includes(currentFooterVariant) && (
          <I18nTextArea
            label={t('editor.controls.footer.disclaimer', 'Disclaimer')}
            value={data.footer.disclaimerText || ''}
            onChange={(val) => setNestedData('footer.disclaimerText', val)}
            rows={3}
          />
        )}
      </div>


      {/* ========== LINK COLUMNS ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Columns size={14} />
          Link Columns
        </label>
        <div className="space-y-4">
        {(data.footer.linkColumns || []).map((col, colIndex) => (
          <div key={colIndex} className="bg-q-bg p-3 rounded border border-q-border space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <I18nInput placeholder="Column Title" value={col.title} onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.title`, val)} className="flex-1 mb-0" />
              <button type="button" onClick={() => {
                const newCols = (data.footer.linkColumns || []).filter((_, i) => i !== colIndex);
                setNestedData('footer.linkColumns', newCols);
              }} className="text-red-400 hover:text-red-500 flex-shrink-0 hover:bg-red-500/10 rounded p-1 transition-colors"><Trash2 size={14} /></button>
            </div>

            <Select
              value={col.menuId || ''}
              onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.menuId`, val === '' ? undefined : val)}
              options={[
                { value: '', label: 'Manual Links' },
                ...menus.map(menu => ({ value: menu.id, label: menu.title })),
              ]}
              noMargin
            />

            {col.menuId ? (
              <p className="text-[10px] text-q-text-secondary italic">Using links from menu: {menus.find(m => m.id === col.menuId)?.title}</p>
            ) : (
              <>
                {(col.links || []).map((link, linkIndex) => (
                  <div key={linkIndex} className="flex gap-2 items-center mb-1">
                    <I18nInput placeholder="Text" value={link.text} onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.text`, val)} className="flex-1 mb-0" />
                    <I18nInput placeholder="Href" value={link.href} onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.href`, val)} className="flex-1 mb-0" />
                    <button type="button" onClick={() => {
                      const newLinks = (col.links || []).filter((_, i) => i !== linkIndex);
                      setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                    }} className="text-q-text-secondary hover:text-red-400 flex-shrink-0"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => {
                  const newLinks = [...(col.links || []), { text: 'New Link', href: '/' }];
                  setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                }} className="text-xs text-q-accent hover:underline mt-1">+ Add Link</button>
              </>
            )}
          </div>
        ))}
          <button type="button" onClick={() => setNestedData('footer.linkColumns', [...(data.footer.linkColumns || []), { title: 'New Column', links: [] }])} className="w-full py-2 border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={14} /> Add Column</button>
        </div>
      </div>


      {/* ========== SOCIAL LINKS ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Share2 size={14} />
          Redes Sociales
        </label>
        <SocialLinksEditor
          socialLinks={data.footer.socialLinks}
          onUpdate={(newLinks) => setNestedData('footer.socialLinks', newLinks)}
          onUpdateHref={(index, href) => setNestedData(`footer.socialLinks.${index}.href`, href)}
        />
      </div>


      {/* ========== CONTACT INFORMATION ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <MapPin size={14} />
          Contact Information
        </label>
        <div className="space-y-3">
          <I18nInput label={t('editor.controls.common.address')} value={data.footer.contactInfo?.address || ''} onChange={(val) => setNestedData('footer.contactInfo.address', val)} placeholder="123 Main Street" />
          <div className="grid grid-cols-2 gap-2">
            <I18nInput label={t('editor.controls.common.city')} value={data.footer.contactInfo?.city || ''} onChange={(val) => setNestedData('footer.contactInfo.city', val)} placeholder="City" />
            <I18nInput label={t('editor.controls.common.state')} value={data.footer.contactInfo?.state || ''} onChange={(val) => setNestedData('footer.contactInfo.state', val)} placeholder="State" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <I18nInput label={t('editor.controls.common.zipCode')} value={data.footer.contactInfo?.zipCode || ''} onChange={(val) => setNestedData('footer.contactInfo.zipCode', val)} placeholder="12345" />
            <I18nInput label={t('editor.controls.common.country')} value={data.footer.contactInfo?.country || ''} onChange={(val) => setNestedData('footer.contactInfo.country', val)} placeholder="Country" />
          </div>
          <I18nInput label={t('editor.controls.common.phone')} value={data.footer.contactInfo?.phone || ''} onChange={(val) => setNestedData('footer.contactInfo.phone', val)} placeholder="+1 (555) 123-4567" />
          <I18nInput label={t('editor.controls.common.email')} value={data.footer.contactInfo?.email || ''} onChange={(val) => setNestedData('footer.contactInfo.email', val)} placeholder="contact@example.com" />
        </div>
      </div>


      {/* ========== BUSINESS HOURS ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock size={14} />
          Business Hours
        </label>
        <div className="flex gap-2 flex-wrap">
          <button type="button"             onClick={() => {
              const businessHours = data.footer.contactInfo?.businessHours || {};
              const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
              const newHours: any = {};
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                newHours[day] = { ...monHours };
              });
              setNestedData('footer.contactInfo.businessHours', { ...businessHours, ...newHours });
            }}
            className="text-xs px-2 py-1 bg-q-accent/20 text-q-accent rounded hover:bg-q-accent/30 transition-colors"
          >
            Copy Mon → Weekdays
          </button>
          <button type="button"             onClick={() => {
              const businessHours = data.footer.contactInfo?.businessHours || {};
              const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
              const newHours: any = {};
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                newHours[day] = { ...monHours };
              });
              setNestedData('footer.contactInfo.businessHours', newHours);
            }}
            className="text-xs px-2 py-1 bg-q-accent/20 text-q-accent rounded hover:bg-q-accent/30 transition-colors"
          >
            Copy Mon → All Days
          </button>
        </div>

        <div className="space-y-2 bg-q-bg p-3 rounded-lg border border-q-border">
          {[
            { key: 'monday', label: 'Mon' },
            { key: 'tuesday', label: 'Tue' },
            { key: 'wednesday', label: 'Wed' },
            { key: 'thursday', label: 'Thu' },
            { key: 'friday', label: 'Fri' },
            { key: 'saturday', label: 'Sat' },
            { key: 'sunday', label: 'Sun' },
          ].map(({ key, label }) => {
            const contactInfo = data.footer.contactInfo || {};
            const businessHours = contactInfo.businessHours || {};
            const dayHours = businessHours[key as keyof typeof businessHours] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };

            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-10 text-xs font-medium text-q-text-secondary">{label}</span>
                <button type="button"                   onClick={() => {
                    if (!dayHours.isOpen) {
                      setNestedData(`footer.contactInfo.businessHours.${key}`, {
                        isOpen: true,
                        openTime: dayHours.openTime || '09:00',
                        closeTime: dayHours.closeTime || '17:00'
                      });
                    } else {
                      setNestedData(`footer.contactInfo.businessHours.${key}.isOpen`, false);
                    }
                  }}
                  className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${dayHours.isOpen ? 'bg-green-500' : 'bg-q-surface-overlay'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dayHours.isOpen ? 'left-5' : 'left-0.5'}`} />
                </button>
                {dayHours.isOpen ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input type="time" value={dayHours.openTime || '09:00'} onChange={(val) => setNestedData(`footer.contactInfo.businessHours.${key}.openTime`, val)} className="w-[90px] bg-q-surface border border-q-border rounded px-1.5 py-0.5 text-xs text-q-text-primary" />
                    <span className="text-q-text-secondary text-xs">-</span>
                    <input type="time" value={dayHours.closeTime || '17:00'} onChange={(val) => setNestedData(`footer.contactInfo.businessHours.${key}.closeTime`, val)} className="w-[90px] bg-q-surface border border-q-border rounded px-1.5 py-0.5 text-xs text-q-text-primary" />
                  </div>
                ) : (
                  <span className="text-xs text-q-text-secondary italic">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== VARIANT ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layout size={14} />
          Footer Variant
        </label>
        <Select
          value={currentFooterVariant}
          onChange={(val) => setNestedData('footer.footerVariant', val)}
          groups={FOOTER_VARIANT_GROUPS}
          noMargin
        />
        <p className="mt-2 text-xs text-q-text-secondary">{currentFooterVariantMeta.description}</p>
      </div>

      {usesFooterImage && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
          <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Image size={14} />
            {t('editor.controls.footer.backgroundImage', 'Footer image')}
          </label>
          <ImagePicker
            label={t('editor.controls.common.backgroundImage', 'Background image')}
            value={data.footer.backgroundImageUrl || ''}
            onChange={(url) => setNestedData('footer.backgroundImageUrl', url)}
          />
        </div>
      )}

      {/* ========== NEON GLOW ========== */}
      {currentFooterVariant === 'neon-glow' && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
          <CardGlowControl
            enabled={data.footer.cardGlow?.enabled !== false}
            color={data.footer.cardGlow?.color || '#144CCD'}
            intensity={data.footer.cardGlow?.intensity ?? 100}
            borderRadius={data.footer.cardGlow?.borderRadius ?? 0}
            gradientStart={data.footer.cardGlow?.gradientStart || '#0A0909'}
            gradientEnd={data.footer.cardGlow?.gradientEnd || '#09101F'}
            onEnabledChange={(v) => setNestedData('footer.cardGlow.enabled', v)}
            onColorChange={(v) => setNestedData('footer.cardGlow.color', v)}
            onIntensityChange={(v) => setNestedData('footer.cardGlow.intensity', v)}
            onBorderRadiusChange={(v) => setNestedData('footer.cardGlow.borderRadius', v)}
            onGradientStartChange={(v) => setNestedData('footer.cardGlow.gradientStart', v)}
            onGradientEndChange={(v) => setNestedData('footer.cardGlow.gradientEnd', v)}
          />
        </div>
      )}

      {/* ========== TYPOGRAPHY ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          Tipografía
        </label>
        <div className="space-y-3">
          <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.footer.titleFontSize || 'sm'} onChange={(v) => setNestedData('footer.titleFontSize', v)} />
          <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.footer.descriptionFontSize || 'sm'} onChange={(v) => setNestedData('footer.descriptionFontSize', v)} />
        </div>
      </div>


      {/* ========== COLORS ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Palette size={14} />
          {t('editor.controls.common.colors')}
        </label>
        <div className="space-y-3">
          <ColorControl label={t('editor.controls.common.background')} value={data.footer.colors?.background} onChange={(v) => setNestedData('footer.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.footer.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('footer.colors.heading', v)} />
          <ColorControl label={t('controls.text')} value={data.footer.colors?.text} onChange={(v) => setNestedData('footer.colors.text', v)} />
          <ColorControl label={t('editor.controls.common.description', 'Description')} value={data.footer.colors?.description || data.footer.colors?.text} onChange={(v) => setNestedData('footer.colors.description', v)} />
          <ColorControl label={t('controls.accent', 'Accent')} value={data.footer.colors?.accent || data.footer.colors?.linkHover} onChange={(v) => setNestedData('footer.colors.accent', v)} />
          <ColorControl label={t('editor.controls.footer.wordmarkColor', 'Wordmark')} value={data.footer.colors?.wordmark || data.footer.colors?.heading} onChange={(v) => setNestedData('footer.colors.wordmark', v)} />
          <ColorControl label={t('editor.controls.footer.panelBackground', 'Panel background')} value={data.footer.colors?.panelBackground || data.footer.colors?.background} onChange={(v) => setNestedData('footer.colors.panelBackground', v)} />
          <ColorControl label={t('editor.controls.footer.panelText', 'Panel text')} value={data.footer.colors?.panelText || data.footer.colors?.heading} onChange={(v) => setNestedData('footer.colors.panelText', v)} />
          <ColorControl label={t('editor.controls.footer.buttonBackground', 'Button background')} value={data.footer.colors?.buttonBackground || data.footer.colors?.accent} onChange={(v) => setNestedData('footer.colors.buttonBackground', v)} />
          <ColorControl label={t('editor.controls.footer.buttonText', 'Button text')} value={data.footer.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('footer.colors.buttonText', v)} />
          <ColorControl label={t('editor.controls.footer.inputBackground', 'Input background')} value={data.footer.colors?.inputBackground || '#ffffff'} onChange={(v) => setNestedData('footer.colors.inputBackground', v)} />
          <ColorControl label={t('editor.controls.footer.inputText', 'Input text')} value={data.footer.colors?.inputText || '#111111'} onChange={(v) => setNestedData('footer.colors.inputText', v)} />
          <ColorControl label={t('editor.controls.footer.legalBackground', 'Legal background')} value={data.footer.colors?.legalBackground || data.footer.colors?.background} onChange={(v) => setNestedData('footer.colors.legalBackground', v)} />
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
