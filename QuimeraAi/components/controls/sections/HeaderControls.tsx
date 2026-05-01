/**
 * HeaderControls.tsx
 * Section controls extracted from Controls.tsx
 */
import React, { useState, useRef } from 'react';
import { ROUTES } from '../../../routes/config';

import ColorControl from '../../ui/ColorControl';
import ImagePicker from '../../ui/ImagePicker';
import IconSelector from '../../ui/IconSelector';
import AIFormControl from '../../ui/AIFormControl';
import TabbedControls from '../../ui/TabbedControls';
import AnimationControls from '../../ui/AnimationControls';
import SocialLinksEditor from '../../ui/SocialLinksEditor';
import { Input, TextArea, I18nInput, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector, SliderControl } from '../../ui/EditorControlPrimitives';
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


export const renderHeaderControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.header) return null;

  const activeMenuId = data.header.menuId || '';

  return (
    <div className="space-y-4">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t("controls.glassmorphismTransparencia", "Glassmorphism Background")}
          checked={data?.header?.glassEffect || false}
          onChange={(v) => setNestedData("header.glassEffect", v)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Select
            label={t('editor.controls.header.layout')}
            value={data.header.layout}
            onChange={(val) => setNestedData('header.layout', val)}
            options={[
              { value: 'minimal', label: t('editor.controls.header.minimal') },
              { value: 'classic', label: 'Classic' },
              { value: 'center', label: 'Center' },
              { value: 'stack', label: 'Stack' },
            ]}
            noMargin
          />
        </div>
        <div>
          <Select
            label={t('editor.controls.header.style')}
            value={data.header.style}
            onChange={(val) => setNestedData('header.style', val)}
            groups={[
              { label: t('editor.controls.header.classic'), options: [
                { value: 'sticky-solid', label: 'Solid' },
                { value: 'sticky-transparent', label: 'Transparent' },
                { value: 'floating', label: 'Floating' },
              ]},
              { label: 'Edge-to-Edge', options: [
                { value: 'edge-solid', label: 'Edge Solid' },
                { value: 'edge-minimal', label: 'Edge Minimal' },
                { value: 'edge-bordered', label: 'Edge Bordered' },
              ]},
              { label: 'Floating', options: [
                { value: 'floating-pill', label: 'Floating Pill' },
                { value: 'floating-glass', label: t('editor.controls.header.glass') },
                { value: 'floating-shadow', label: 'Floating Shadow' },
              ]},
              { label: 'Gradient', options: [
                { value: 'transparent-blur', label: 'Gradient Blur' },
                { value: 'transparent-bordered', label: 'Gradient Bordered' },
                { value: 'transparent-gradient', label: 'Gradient Fade' },
                { value: 'transparent-gradient-dark', label: 'Gradient Dark' },
              ]},
              { label: 'Special', options: [
                { value: 'tabbed', label: 'Tabbed Menu' },
                { value: 'segmented-pill', label: 'Segmented Pill' },
              ]},
            ]}
            noMargin
          />
        </div>
      </div>
      {data.header.style === 'segmented-pill' && (
          <div className="mt-3">
            <ToggleControl
              label={t('controls.botonesEnDiagonal')}
              checked={data.header.segmentedPillSlanted === true}
              onChange={(v) => setNestedData('header.segmentedPillSlanted', v)}
            />
            {data.header.segmentedPillSlanted === true && (
              <div className="animate-fade-in-up mt-2">
                <SliderControl
                  label={t('controls.inclinacin')}
                  value={data.header.segmentedPillSlantedAngle ?? 15}
                  onChange={(v) => setNestedData('header.segmentedPillSlantedAngle', v)}
                  min={5}
                  max={45}
                  step={1}
                  suffix="°"
                />
              </div>
            )}
          </div>
        )}


      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.logoType')}</label>
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border mb-3">
          {['text', 'image', 'both'].map(type => (
            <button type="button"               key={type}
              onClick={() => setNestedData('header.logoType', type)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${data.header.logoType === type ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary'}`}
            >
              {type}
            </button>
          ))}
        </div>

        {(data.header.logoType === 'text' || data.header.logoType === 'both') && (
          <I18nInput label={t('editor.controls.header.logoText')} value={data.header.logoText} onChange={(val) => setNestedData('header.logoText', val)} />
        )}

        {(data.header.logoType === 'image' || data.header.logoType === 'both') && (
          <div className="space-y-3 mt-3">
            <ImagePicker
              label={t('editor.controls.header.logoImage')}
              value={data.header.logoImageUrl}
              onChange={(url) => {
                setNestedData('header.logoImageUrl', url);
                // If uploading/selecting, ensure image mode is active if previously text only
                if (data.header.logoType === 'text') {
                  setNestedData('header.logoType', 'image');
                }
              }}
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <SliderControl
                label={t('editor.controls.header.logoWidth')}
                value={data.header.logoWidth}
                onChange={(v) => setNestedData('header.logoWidth', v)}
                min={40}
                max={300}
                step={5}
                suffix="px"
              />
              <SliderControl
                label={t('editor.controls.header.logoHeight', 'Altura')}
                value={data.header.logoHeight || 0}
                onChange={(v) => setNestedData('header.logoHeight', v)}
                min={0}
                max={150}
                step={5}
                suffix="px"
              />
            </div>
          </div>
        )}
      </div>


      {/* Favicon Upload Section */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('editor.controls.header.favicon')}</label>

        <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-q-border bg-q-bg/50">
          {/* Preview */}
          <div className="relative group">
            {activeProject?.faviconUrl ? (
              <div className="relative">
                <div className="w-16 h-16 rounded-xl border-2 border-q-border overflow-hidden flex items-center justify-center"
                  style={{ backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}>
                  <img
                    src={activeProject.faviconUrl}
                    alt="Favicon"
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <button type="button"                   onClick={() => {
                    // TODO: Implement removeFavicon functionality
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                  title="Eliminar favicon"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-q-border/60 flex flex-col items-center justify-center bg-q-bg gap-1">
                <Star size={18} className="text-q-text-secondary/40" />
                <span className="text-[9px] text-q-text-secondary/40 font-medium">ICO / PNG</span>
              </div>
            )}
          </div>

          <I18nInput
            ref={faviconInputRef}
            type="file"
            accept=".ico,.png,.svg,image/png,image/svg+xml,image/x-icon"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && activeProject) {
                setIsUploadingFavicon(true);
                try {
                  await updateProjectFavicon(activeProject.id, file);
                } catch (error) {
                  console.error('Failed to upload favicon:', error);
                } finally {
                  setIsUploadingFavicon(false);
                }
              }
              e.target.value = '';
            }}
          />

          <button type="button"             onClick={() => faviconInputRef.current?.click()}
            disabled={isUploadingFavicon}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 bg-q-accent/10 text-q-accent hover:bg-q-accent/20 border border-q-accent/20"
          >
            {isUploadingFavicon ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-q-accent border-t-transparent rounded-full animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload size={13} />
                {activeProject?.faviconUrl ? t('editor.controls.header.change') : t('editor.controls.header.upload')}
              </>
            )}
          </button>
        </div>
      </div>




      <div className="space-y-3">
        <ToggleControl label={t('editor.controls.navigation.showLogin')} checked={data.header.showLogin !== false} onChange={(v) => setNestedData('header.showLogin', v)} />

        {data.header.showLogin !== false && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
            <I18nInput label={t('editor.controls.common.text')} value={data.header.loginText || 'Login'} onChange={(val) => setNestedData('header.loginText', val)} className="mb-0" />
            <I18nInput label={t('editor.controls.common.url')} value={data.header.loginUrl || '#'} onChange={(val) => setNestedData('header.loginUrl', val)} className="mb-0" />
          </div>
        )}
      </div>


      {/* Search Controls */}
      <div className="space-y-3">
        <ToggleControl label={t('editor.controls.navigation.showSearch')} checked={data.header.showSearch === true} onChange={(v) => setNestedData('header.showSearch', v)} />

        {data.header.showSearch === true && (
          <div className="animate-fade-in-up">
            <I18nInput label={t('editor.controls.navigation.placeholder')} value={data.header.searchPlaceholder || `${t('editor.controls.common.search')}...`} onChange={(val) => setNestedData('header.searchPlaceholder', val)} className="mb-0" />
          </div>
        )}
      </div>


      {/* Navigation Menu Selector */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.source')}</label>
        <div className="flex gap-2 mb-3">
          <Select
            value={activeMenuId === 'manual' ? '' : activeMenuId}
            onChange={(val) => setNestedData('header.menuId', val === '' ? 'manual' : val)}
            options={[
              { value: '', label: t('editor.controls.navigation.manual') },
              ...menus.map(menu => ({ value: menu.id, label: menu.title })),
            ]}
            noMargin
          />
          <button type="button"             onClick={() => navigate(ROUTES.NAVIGATION)}
            className="p-2 bg-q-bg border border-q-border rounded text-q-text-secondary hover:text-q-text-primary hover:bg-q-surface"
            title="Manage Menus"
          >
            <Settings size={16} />
          </button>
        </div>

        {activeMenuId && activeMenuId !== 'manual' ? (
          <div className="p-3 bg-q-accent/10 border border-q-accent/20 rounded text-xs text-q-text-primary mb-2">
            Links are currently being pulled from the <strong>{menus.find(m => m.id === activeMenuId)?.title || 'selected'}</strong> menu.
          </div>
        ) : (
          <>
            <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.customLinks')}</label>
            {(data.header.links || []).map((link, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center relative">
                <div className="w-10 flex-shrink-0">
                  <IconSelector
                    value={(link.icon as any) || 'home'}
                    onChange={(icon) => {
                      setNestedData(`header.links.${i}.icon`, icon);
                      if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
                    }}
                    size="sm"
                    hideText={true}
                    hideChevron={true}
                    fullWidthModal={true}
                  />
                </div>
                <I18nInput className="flex-1 min-w-0 mb-0" placeholder="Title" value={link.text} onChange={(val) => {
                  setNestedData(`header.links.${i}.text`, val);
                  if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
                }} />
                <I18nInput className="flex-1 min-w-0 mb-0" placeholder="URL" value={link.href} onChange={(val) => {
                  setNestedData(`header.links.${i}.href`, val);
                  if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
                }} />
                <button type="button"                   onClick={() => {
                    const newLinks = data.header.links.filter((_, idx) => idx !== i);
                    setNestedData('header.links', newLinks);
                    if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
                  }}
                  className="flex-shrink-0 text-q-text-secondary hover:text-red-400 p-1"
                  title="Remove link"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button"               onClick={() => {
                setNestedData('header.links', [...(data.header.links || []), { text: 'New Link', href: '/' }]);
                if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
              }}
              className="text-xs text-q-accent hover:underline flex items-center mt-1"
            >
              <Plus size={12} className="mr-1" /> {t('editor.controls.navigation.addLink')}
            </button>
          </>
        )}
      </div>

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.heightHover')}</label>
      <div className="mt-3">
        <SliderControl
          label={t('editor.controls.navigation.height')}
          value={data.header.height || 70}
          onChange={(v) => setNestedData('header.height', v)}
          min={50}
          max={120}
          step={5}
          suffix="px"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.hoverStyle')}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'simple', label: 'Simple' },
            { value: 'underline', label: 'Underline' },
            { value: 'bracket', label: 'Bracket' },
            { value: 'highlight', label: 'Highlight' },
            { value: 'glow', label: 'Glow' }
          ].map(style => (
            <button type="button"               key={style.value}
              onClick={() => setNestedData('header.hoverStyle', style.value)}
              className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${data.header.hoverStyle === style.value ? 'bg-q-accent text-q-bg' : 'bg-q-bg text-q-text-secondary hover:bg-q-surface-overlay border border-q-border'}`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <SliderControl
          label={t('editor.controls.navigation.linkFontSize')}
          value={data.header.linkFontSize || 14}
          onChange={(v) => setNestedData('header.linkFontSize', v)}
          min={10}
          max={24}
          step={1}
          suffix="px"
        />
      </div>

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.ctaButton')}</label>
      <ToggleControl label={t('editor.controls.navigation.showCta')} checked={data.header.showCta !== false} onChange={(v) => setNestedData('header.showCta', v)} />

      {data.header.showCta !== false && (
        <div className="space-y-4 animate-fade-in-up">
          <I18nInput label={t('editor.controls.navigation.buttonText')} value={data.header.ctaText || 'Get Started'} onChange={(val) => setNestedData('header.ctaText', val)} />
          <div>
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.buttonRadius')}</label>
            <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
              {[{ v: 'none', l: 'None' }, { v: 'md', l: 'Med' }, { v: 'xl', l: 'Lg' }, { v: 'full', l: 'Full' }].map((opt) => (
                <button type="button"                   key={opt.v}
                  onClick={() => setNestedData('header.buttonBorderRadius', opt.v)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.header.buttonBorderRadius === opt.v ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <ColorControl label={t('controls.fondoBotn')} value={data.header.colors?.buttonBackground || data.header.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.buttonBackground', v)} />
          <ColorControl label={t('controls.textoBotn')} value={data.header.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('header.colors.buttonText', v)} />

          <div>
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.enlaceDelBotn')}</label>
            <div className="grid grid-cols-4 gap-1 bg-q-bg p-1 rounded-md border border-q-border">
              {[{ value: 'manual', label: 'URL' }, { value: 'product', label: 'Producto' }, { value: 'collection', label: 'Colección' }, { value: 'content', label: 'Contenido' }].map((type) => (
                <button type="button"                   key={type.value}
                  onClick={() => {
                    setNestedData('header.ctaLinkType', type.value);
                    if (type.value === 'section') setNestedData('header.ctaUrl', '#cta');
                    else setNestedData('header.ctaUrl', '');
                  }}
                  className={`py-1.5 px-1 text-[10px] font-medium rounded-sm transition-colors text-center ${(data.header.ctaLinkType || 'manual') === type.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {(data.header.ctaLinkType === 'manual' || !data.header.ctaLinkType) && (
            <I18nInput label={t('controls.url')} value={data.header.ctaUrl || ''} onChange={(val) => setNestedData('header.ctaUrl', val)} placeholder="https://example.com o #seccion" />
          )}
          {data.header.ctaLinkType === 'product' && (
            <SingleProductSelector
              storeId={activeProject?.id || ''}
              selectedProductId={data.header.ctaUrl?.startsWith('/product/') ? data.header.ctaUrl.split('/product/')[1] : undefined}
              onSelect={(id) => setNestedData('header.ctaUrl', id ? `/product/${id}` : '')}
              label={t('editor.controls.common.selectProduct')}
            />
          )}
          {data.header.ctaLinkType === 'collection' && (
            <SingleCollectionSelector
              storeId={activeProject?.id || ''}
              gridCategories={data.categoryGrid?.categories || []}
              selectedCollectionId={data.header.ctaUrl?.includes('collection/') ? data.header.ctaUrl.split('/').pop() : undefined}
              onSelect={(id) => setNestedData('header.ctaUrl', id ? `/collection/${id}` : '')}
              label={t('editor.controls.common.selectCollection')}
            />
          )}
          {data.header.ctaLinkType === 'content' && (
            <SingleContentSelector
              selectedContentPath={data.header.ctaUrl}
              onSelect={(path) => setNestedData('header.ctaUrl', path || '')}
              label={t('editor.controls.common.selectContent')}
            />
          )}
        </div>
      )}

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.common.colors')}</label>
      <ColorControl label={t('editor.controls.common.background')} value={data.header.colors?.background} onChange={(v) => setNestedData('header.colors.background', v)} />
      <ColorControl label={t('editor.controls.common.text')} value={data.header.colors?.text} onChange={(v) => setNestedData('header.colors.text', v)} />
      <ColorControl label={t('editor.controls.common.accent')} value={data.header.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.accent', v)} />
      {(data.header.style === 'transparent-gradient' || data.header.style === 'transparent-gradient-dark') && (
        <>
          <ColorControl
            label={data.header.style === 'transparent-gradient-dark' ? "Color Gradiente Oscuro" : "Color Gradiente Fade"}
            value={data.header.style === 'transparent-gradient-dark' ? (data.header.colors?.gradientDarkColor || data.header.colors?.background || '#1e1b4b') : (data.header.colors?.gradientFadeColor || data.header.colors?.background || '#c7d2fe')}
            onChange={(v) => setNestedData(data.header.style === 'transparent-gradient-dark' ? 'header.colors.gradientDarkColor' : 'header.colors.gradientFadeColor', v)}
          />
          <div className="mt-3">
            <SliderControl
              label={t('controls.tamaoDelGradiente')}
              value={data.header.gradientFadeSize ?? 15}
              onChange={(v) => setNestedData('header.gradientFadeSize', v)}
              min={0}
              max={100}
              step={1}
              suffix="%"
            />
          </div>
        </>
      )}
      {data.header.style === 'tabbed' && (
        <>
          <ColorControl
            label="Color Tab Activo"
            value={data.header.colors?.tabActiveColor || data.header.colors?.accent || '#3b82f6'}
            onChange={(v) => setNestedData('header.colors.tabActiveColor', v)}
          />
          <ColorControl
            label="Color Borde Inferior"
            value={data.header.colors?.tabBorderColor || 'rgba(128,128,128,0.15)'}
            onChange={(v) => setNestedData('header.colors.tabBorderColor', v)}
          />
        </>
      )}
    </div>
  )
}

// ─── ─── ─── ─── ─── ─── ───

export const renderHeaderControlsWithTabs = (deps: ControlsDeps, hideNavigationLinks: boolean = false) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.header) return null;
  const activeMenuId = data.header.menuId || '';

  const contentTab = (
    <div className="space-y-4">
      {/* Logo controls moved to styleTab as requested */}


      {/* ========== FAVICON ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star size={14} />
          {t('editor.controls.header.favicon')}
        </label>

        <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-q-border bg-q-bg/50">
          {/* Preview */}
          <div className="relative group">
            {activeProject?.faviconUrl ? (
              <div className="relative">
                <div className="w-16 h-16 rounded-xl border-2 border-q-border overflow-hidden flex items-center justify-center"
                  style={{ backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}>
                  <img
                    src={activeProject.faviconUrl}
                    alt="Favicon"
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <button type="button"                   onClick={async () => {
                    if (activeProject) {
                      try {
                        await updateProjectFavicon(activeProject.id, null as any);
                      } catch (error) {
                        console.error('Failed to remove favicon:', error);
                      }
                    }
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                  title="Eliminar favicon"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-q-border/60 flex flex-col items-center justify-center bg-q-bg gap-1">
                <Star size={18} className="text-q-text-secondary/40" />
                <span className="text-[9px] text-q-text-secondary/40 font-medium">ICO / PNG</span>
              </div>
            )}
          </div>

          <I18nInput
            ref={faviconInputRef}
            type="file"
            accept=".ico,.png,.svg,image/png,image/svg+xml,image/x-icon"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && activeProject) {
                setIsUploadingFavicon(true);
                try {
                  await updateProjectFavicon(activeProject.id, file);
                } catch (error) {
                  console.error('Failed to upload favicon:', error);
                } finally {
                  setIsUploadingFavicon(false);
                }
              }
              e.target.value = '';
            }}
          />

          <button type="button"             onClick={() => faviconInputRef.current?.click()}
            disabled={isUploadingFavicon}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 bg-q-accent/10 text-q-accent hover:bg-q-accent/20 border border-q-accent/20"
          >
            {isUploadingFavicon ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-q-accent border-t-transparent rounded-full animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload size={13} />
                {activeProject?.faviconUrl ? t('editor.controls.header.change') : t('editor.controls.header.upload')}
              </>
            )}
          </button>
        </div>
      </div>


      {/* ========== VISIBILITY (Login + Search) ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Eye size={14} />
          Visibilidad
        </label>

        <div className="space-y-3">
          <ToggleControl label={t('editor.controls.navigation.showLogin')} checked={data.header.showLogin !== false} onChange={(v) => setNestedData('header.showLogin', v)} />
          {data.header.showLogin !== false && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
              <I18nInput label={t('editor.controls.common.text')} value={data.header.loginText || 'Login'} onChange={(val) => setNestedData('header.loginText', val)} className="mb-0" />
              <I18nInput label={t('editor.controls.common.url')} value={data.header.loginUrl || '#'} onChange={(val) => setNestedData('header.loginUrl', val)} className="mb-0" />
            </div>
          )}
        </div>

        <div className="space-y-3 mt-3">
          <ToggleControl label={t('editor.controls.navigation.showSearch')} checked={data.header.showSearch === true} onChange={(v) => setNestedData('header.showSearch', v)} />
          {data.header.showSearch === true && (
            <div className="animate-fade-in-up">
              <I18nInput label={t('editor.controls.navigation.placeholder')} value={data.header.searchPlaceholder || `${t('editor.controls.common.search')}...`} onChange={(val) => setNestedData('header.searchPlaceholder', val)} className="mb-0" />
            </div>
          )}
        </div>

        <div className="space-y-3 mt-3">
          <ToggleControl label={t('editor.controls.navigation.showLanguageSelector', 'Selector de Idioma')} checked={data.header.showLanguageSelector !== false} onChange={(v) => setNestedData('header.showLanguageSelector', v)} />
        </div>
      </div>


      {/* ========== NAVIGATION LINKS ========== */}
      {!hideNavigationLinks && (
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Link size={14} />
          Enlaces de Navegación
        </label>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.source')}</label>
          <div className="flex gap-2 mb-3">
            <Select
              value={activeMenuId === 'manual' ? '' : activeMenuId}
              onChange={(val) => setNestedData('header.menuId', val === '' ? 'manual' : val)}
              options={[
                { value: '', label: t('editor.controls.navigation.manual') },
                ...menus.map(menu => ({ value: menu.id, label: menu.title })),
              ]}
              noMargin
            />
            <button type="button"               onClick={() => navigate(ROUTES.NAVIGATION)}
              className="p-2 bg-q-bg border border-q-border rounded text-q-text-secondary hover:text-q-text-primary hover:bg-q-surface"
              title="Manage Menus"
            >
              <Settings size={16} />
            </button>
          </div>

          {activeMenuId && activeMenuId !== 'manual' ? (
            <div className="p-3 bg-q-accent/10 border border-q-accent/20 rounded text-xs text-q-text-primary mb-2">
              Links are currently being pulled from the <strong>{menus.find(m => m.id === activeMenuId)?.title || 'selected'}</strong> menu.
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.customLinks')}</label>
              {(data.header.links || []).map((link, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center relative">
                  <div className="w-10 flex-shrink-0">
                    <IconSelector
                      value={(link.icon as any) || 'home'}
                      onChange={(icon) => {
                        setNestedData(`header.links.${i}.icon`, icon);
                        if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
                      }}
                      size="sm"
                      hideText={true}
                      hideChevron={true}
                      fullWidthModal={true}
                    />
                  </div>
                  <I18nInput className="flex-1 min-w-0 mb-0" placeholder="Title" value={link.text} onChange={(val) => {
                    setNestedData(`header.links.${i}.text`, val);
                    if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
                  }} />
                  <I18nInput className="flex-1 min-w-0 mb-0" placeholder="URL" value={link.href} onChange={(val) => {
                    setNestedData(`header.links.${i}.href`, val);
                    if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
                  }} />
                  <button type="button"                     onClick={() => {
                      const newLinks = data.header.links.filter((_, idx) => idx !== i);
                      setNestedData('header.links', newLinks);
                      if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
                    }}
                    className="flex-shrink-0 text-q-text-secondary hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button"                 onClick={() => {
                  setNestedData('header.links', [...(data.header.links || []), { text: 'New Link', href: '/' }]);
                  if (activeMenuId !== 'manual') setNestedData('header.menuId', 'manual');
                }}
                className="text-xs text-q-accent hover:underline flex items-center mt-1"
              >
                <Plus size={12} className="mr-1" /> {t('editor.controls.navigation.addLink')}
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* ========== CTA BUTTON ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <MousePointerClick size={14} />
          {t('editor.controls.navigation.ctaButton')}
        </label>

        <ToggleControl label={t('editor.controls.navigation.showCta')} checked={data.header.showCta !== false} onChange={(v) => setNestedData('header.showCta', v)} />

        {data.header.showCta !== false && (
          <div className="space-y-3 animate-fade-in-up mt-3">
            <I18nInput label={t('editor.controls.navigation.buttonText')} value={data.header.ctaText || 'Get Started'} onChange={(val) => setNestedData('header.ctaText', val)} />

            <div>
              <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.enlaceDelBotn')}</label>
              <div className="grid grid-cols-4 gap-1 bg-q-bg p-1 rounded-md border border-q-border">
                {[{ value: 'manual', label: 'URL' }, { value: 'product', label: 'Producto' }, { value: 'collection', label: 'Colección' }, { value: 'content', label: 'Contenido' }].map((type) => (
                  <button type="button"                     key={type.value}
                    onClick={() => {
                      setNestedData('header.ctaLinkType', type.value);
                      if (type.value === 'section') setNestedData('header.ctaUrl', '#cta');
                      else setNestedData('header.ctaUrl', '');
                    }}
                    className={`py-1.5 px-1 text-[10px] font-medium rounded-sm transition-colors text-center ${(data.header.ctaLinkType || 'manual') === type.value ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {(data.header.ctaLinkType === 'manual' || !data.header.ctaLinkType) && (
              <I18nInput label={t('controls.url')} value={data.header.ctaUrl || ''} onChange={(val) => setNestedData('header.ctaUrl', val)} placeholder="https://example.com o #seccion" />
            )}
            {data.header.ctaLinkType === 'product' && (
              <SingleProductSelector
                storeId={activeProject?.id || ''}
                selectedProductId={data.header.ctaUrl?.startsWith('/product/') ? data.header.ctaUrl.split('/product/')[1] : undefined}
                onSelect={(id) => setNestedData('header.ctaUrl', id ? `/product/${id}` : '')}
                label={t('editor.controls.common.selectProduct')}
              />
            )}
            {data.header.ctaLinkType === 'collection' && (
              <SingleCollectionSelector
                storeId={activeProject?.id || ''}
                gridCategories={data.categoryGrid?.categories || []}
                selectedCollectionId={data.header.ctaUrl?.includes('collection/') ? data.header.ctaUrl.split('/').pop() : undefined}
                onSelect={(id) => setNestedData('header.ctaUrl', id ? `/collection/${id}` : '')}
                label={t('editor.controls.common.selectCollection')}
              />
            )}
            {data.header.ctaLinkType === 'content' && (
              <SingleContentSelector
                selectedContentPath={data.header.ctaUrl}
                onSelect={(path) => setNestedData('header.ctaUrl', path || '')}
                label={t('editor.controls.common.selectContent')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== LOGO ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image size={14} />
          Logo
        </label>

        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.logoType')}</label>
        <div className="flex bg-q-bg p-1 rounded-md border border-q-border mb-3">
          {['text', 'image', 'both'].map(type => (
            <button type="button"               key={type}
              onClick={() => setNestedData('header.logoType', type)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${data.header.logoType === type ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary'}`}
            >
              {type}
            </button>
          ))}
        </div>

        {(data.header.logoType === 'text' || data.header.logoType === 'both') && (
          <I18nInput label={t('editor.controls.header.logoText')} value={data.header.logoText} onChange={(val) => setNestedData('header.logoText', val)} />
        )}

        {(data.header.logoType === 'image' || data.header.logoType === 'both') && (
          <div className="space-y-3 mt-3">
            <ImagePicker
              label={t('editor.controls.header.logoImage')}
              value={data.header.logoImageUrl}
              onChange={(url) => {
                setNestedData('header.logoImageUrl', url);
                if (data.header.logoType === 'text') {
                  setNestedData('header.logoType', 'image');
                }
              }}
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <SliderControl
                label={t('common.width', 'Ancho')}
                value={data.header.logoWidth}
                onChange={(v) => setNestedData('header.logoWidth', v)}
                min={40}
                max={300}
                step={5}
                suffix="px"
              />
              <SliderControl
                label={t('common.height', 'Alto')}
                value={data.header.logoHeight || 0}
                onChange={(v) => setNestedData('header.logoHeight', v)}
                min={0}
                max={150}
                step={5}
                suffix="px"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========== DESIGN (Layout & Style) ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layout size={14} />
          Diseño
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Select
              label={t('editor.controls.header.layout')}
              value={data.header.layout || 'minimal'}
              onChange={(val) => setNestedData('header.layout', val)}
              options={[
                { value: 'minimal', label: t('editor.controls.header.minimal') },
                { value: 'classic', label: 'Classic' },
                { value: 'center', label: 'Center' },
                { value: 'stack', label: 'Stack' },
              ]}
              noMargin
            />
          </div>
          <div>
            <Select
              label={t('editor.controls.header.style')}
              value={data.header.style || 'floating-glass'}
              onChange={(val) => setNestedData('header.style', val)}
              groups={[
                { label: t('editor.controls.header.classic'), options: [
                  { value: 'sticky-solid', label: 'Solid' },
                  { value: 'sticky-transparent', label: 'Transparent' },
                  { value: 'floating', label: 'Floating' },
                ]},
                { label: 'Edge-to-Edge', options: [
                  { value: 'edge-solid', label: 'Edge Solid' },
                  { value: 'edge-minimal', label: 'Edge Minimal' },
                  { value: 'edge-bordered', label: 'Edge Bordered' },
                ]},
                { label: 'Floating', options: [
                  { value: 'floating-pill', label: 'Floating Pill' },
                  { value: 'floating-glass', label: t('editor.controls.header.glass') },
                  { value: 'floating-shadow', label: 'Floating Shadow' },
                ]},
                { label: 'Gradient', options: [
                  { value: 'transparent-blur', label: 'Gradient Blur' },
                  { value: 'transparent-bordered', label: 'Gradient Bordered' },
                  { value: 'transparent-gradient', label: 'Gradient Fade' },
                  { value: 'transparent-gradient-dark', label: 'Gradient Dark' },
                ]},
                { label: 'Special', options: [
                  { value: 'tabbed', label: 'Tabbed Menu' },
                  { value: 'segmented-pill', label: 'Segmented Pill' },
                ]},
              ]}
              noMargin
            />
          </div>
        </div>
        {data.header.style === 'segmented-pill' && (
            <div className="mt-3">
              <ToggleControl
                label={t('controls.botonesEnDiagonal')}
                checked={data.header.segmentedPillSlanted === true}
                onChange={(v) => setNestedData('header.segmentedPillSlanted', v)}
              />
              {data.header.segmentedPillSlanted === true && (
                <div className="animate-fade-in-up mt-2">
                  <SliderControl
                    label={t('controls.inclinacin')}
                    value={data.header.segmentedPillSlantedAngle ?? 15}
                    onChange={(v) => setNestedData('header.segmentedPillSlantedAngle', v)}
                    min={5}
                    max={45}
                    step={1}
                    suffix="°"
                  />
                </div>
              )}
            </div>
          )}
        </div>


      {/* ========== OPTIONS (Sticky & Glass) ========== */}


      {/* ========== HEIGHT & HOVER ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlignJustify size={14} />
          Altura y Hover
        </label>

        <div className="mt-3">
          <SliderControl
            label={t('editor.controls.navigation.height')}
            value={data.header.height || 70}
            onChange={(v) => setNestedData('header.height', v)}
            min={50}
            max={120}
            step={5}
            suffix="px"
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.hoverStyle')}</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'simple', label: 'Simple' },
              { value: 'underline', label: 'Underline' },
              { value: 'bracket', label: 'Bracket' },
              { value: 'highlight', label: 'Highlight' },
              { value: 'glow', label: 'Glow' }
            ].map(style => (
              <button type="button"                 key={style.value}
                onClick={() => setNestedData('header.hoverStyle', style.value)}
                className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${data.header.hoverStyle === style.value ? 'bg-q-accent text-q-bg' : 'bg-q-bg text-q-text-secondary hover:bg-q-surface-overlay border border-q-border'}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <SliderControl
            label={t('editor.controls.navigation.linkFontSize')}
            value={data.header.linkFontSize || 14}
            onChange={(v) => setNestedData('header.linkFontSize', v)}
            min={10}
            max={24}
            step={1}
            suffix="px"
          />
        </div>
      </div>


      {/* ========== BUTTON STYLE ========== */}
      {data.header.showCta !== false && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
          <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <SlidersHorizontal size={14} />
            Estilo de Botón
          </label>
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.buttonRadius')}</label>
          <div className="flex bg-q-bg p-1 rounded-md border border-q-border">
            {[{ v: 'none', l: 'None' }, { v: 'md', l: 'Med' }, { v: 'xl', l: 'Lg' }, { v: 'full', l: 'Full' }].map((opt) => (
              <button type="button"                 key={opt.v}
                onClick={() => setNestedData('header.buttonBorderRadius', opt.v)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.header.buttonBorderRadius === opt.v ? 'bg-q-accent text-q-bg' : 'text-q-text-secondary hover:bg-q-surface-overlay'}`}
              >
                {opt.l}
              </button>
            ))}
          </div>
          <div className="space-y-2 mt-3">
            <ColorControl label={t('controls.fondoBotn')} value={data.header.colors?.buttonBackground || data.header.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.buttonBackground', v)} />
            <ColorControl label={t('controls.textoBotn')} value={data.header.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('header.colors.buttonText', v)} />
          </div>
        </div>
      )}


      {/* ========== COLORS ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Palette size={14} />
          {t('editor.controls.common.colors')}
        </label>
        <div className="space-y-3">
          <ColorControl label={t('editor.controls.common.background')} value={data.header.colors?.background} onChange={(v) => setNestedData('header.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.text')} value={data.header.colors?.text} onChange={(v) => setNestedData('header.colors.text', v)} />
          <ColorControl label={t('editor.controls.common.accent')} value={data.header.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.accent', v)} />
          {(data.header.style === 'transparent-gradient' || data.header.style === 'transparent-gradient-dark') && (
            <>
              <ColorControl
                label={data.header.style === 'transparent-gradient-dark' ? "Color Gradiente Oscuro" : "Color Gradiente Fade"}
                value={data.header.style === 'transparent-gradient-dark' ? (data.header.colors?.gradientDarkColor || data.header.colors?.background || '#1e1b4b') : (data.header.colors?.gradientFadeColor || data.header.colors?.background || '#c7d2fe')}
                onChange={(v) => setNestedData(data.header.style === 'transparent-gradient-dark' ? 'header.colors.gradientDarkColor' : 'header.colors.gradientFadeColor', v)}
              />
              <div className="mt-3">
                <SliderControl
                  label={t('controls.tamaoDelGradiente')}
                  value={data.header.gradientFadeSize ?? 15}
                  onChange={(v) => setNestedData('header.gradientFadeSize', v)}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                />
              </div>
            </>
          )}
          {data.header.style === 'tabbed' && (
            <>
              <ColorControl
                label="Color Tab Activo"
                value={data.header.colors?.tabActiveColor || data.header.colors?.accent || '#3b82f6'}
                onChange={(v) => setNestedData('header.colors.tabActiveColor', v)}
              />
              <ColorControl
                label="Color Borde Inferior"
                value={data.header.colors?.tabBorderColor || 'rgba(128,128,128,0.15)'}
                onChange={(v) => setNestedData('header.colors.tabBorderColor', v)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
