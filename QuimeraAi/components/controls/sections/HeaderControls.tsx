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


export const renderHeaderControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.header) return null;

  const activeMenuId = data.header.menuId || '';

  return (
    <div className="space-y-4">
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
            ]}
            noMargin
          />
        </div>
      </div>


      <div>
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Logo Type</label>
        <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
          {['text', 'image', 'both'].map(type => (
            <button
              key={type}
              onClick={() => setNestedData('header.logoType', type)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${data.header.logoType === type ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}
            >
              {type}
            </button>
          ))}
        </div>

        {(data.header.logoType === 'text' || data.header.logoType === 'both') && (
          <Input label={t('editor.controls.header.logoText')} value={data.header.logoText} onChange={(e) => setNestedData('header.logoText', e.target.value)} />
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
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.header.logoWidth')}</label>
                <span className="text-xs text-editor-text-primary">{data.header.logoWidth}px</span>
              </div>
              <input
                type="range"
                min="40"
                max="300"
                step="5"
                value={data.header.logoWidth}
                onChange={(e) => setNestedData('header.logoWidth', parseInt(e.target.value))}
                className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>


      {/* Favicon Upload Section */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.header.favicon')}</label>

        <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-editor-border bg-editor-bg/50">
          {/* Preview */}
          <div className="relative group">
            {activeProject?.faviconUrl ? (
              <div className="relative">
                <div className="w-16 h-16 rounded-xl border-2 border-editor-border overflow-hidden flex items-center justify-center"
                  style={{ backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}>
                  <img
                    src={activeProject.faviconUrl}
                    alt="Favicon"
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <button
                  onClick={() => {
                    // TODO: Implement removeFavicon functionality
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                  title="Eliminar favicon"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-editor-border/60 flex flex-col items-center justify-center bg-editor-bg gap-1">
                <Star size={18} className="text-editor-text-secondary/40" />
                <span className="text-[9px] text-editor-text-secondary/40 font-medium">ICO / PNG</span>
              </div>
            )}
          </div>

          <input
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

          <button
            onClick={() => faviconInputRef.current?.click()}
            disabled={isUploadingFavicon}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 bg-editor-accent/10 text-editor-accent hover:bg-editor-accent/20 border border-editor-accent/20"
          >
            {isUploadingFavicon ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-editor-accent border-t-transparent rounded-full animate-spin" />
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
            <Input label={t('editor.controls.common.text')} value={data.header.loginText || 'Login'} onChange={(e) => setNestedData('header.loginText', e.target.value)} className="mb-0" />
            <Input label={t('editor.controls.common.url')} value={data.header.loginUrl || '#'} onChange={(e) => setNestedData('header.loginUrl', e.target.value)} className="mb-0" />
          </div>
        )}
      </div>


      {/* Search Controls */}
      <div className="space-y-3">
        <ToggleControl label={t('editor.controls.navigation.showSearch')} checked={data.header.showSearch === true} onChange={(v) => setNestedData('header.showSearch', v)} />

        {data.header.showSearch === true && (
          <div className="animate-fade-in-up">
            <Input label={t('editor.controls.navigation.placeholder')} value={data.header.searchPlaceholder || `${t('editor.controls.common.search')}...`} onChange={(e) => setNestedData('header.searchPlaceholder', e.target.value)} className="mb-0" />
          </div>
        )}
      </div>


      {/* Navigation Menu Selector */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.source')}</label>
        <div className="flex gap-2 mb-3">
          <Select
            value={activeMenuId}
            onChange={(val) => setNestedData('header.menuId', val === '' ? undefined : val)}
            options={[
              { value: '', label: t('editor.controls.navigation.manual') },
              ...menus.map(menu => ({ value: menu.id, label: menu.title })),
            ]}
            noMargin
          />
          <button
            onClick={() => navigate(ROUTES.NAVIGATION)}
            className="p-2 bg-editor-bg border border-editor-border rounded text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg"
            title="Manage Menus"
          >
            <Settings size={16} />
          </button>
        </div>

        {activeMenuId ? (
          <div className="p-3 bg-editor-accent/10 border border-editor-accent/20 rounded text-xs text-editor-text-primary mb-2">
            Links are currently being pulled from the <strong>{menus.find(m => m.id === activeMenuId)?.title || 'selected'}</strong> menu.
          </div>
        ) : (
          <>
            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.customLinks')}</label>
            {(data.header.links || []).map((link, i) => (
              <div key={i} className="flex gap-2 mb-2 overflow-hidden">
                <input className="flex-1 min-w-0 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.text} onChange={(e) => setNestedData(`header.links.${i}.text`, e.target.value)} />
                <input className="flex-1 min-w-0 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.href} onChange={(e) => setNestedData(`header.links.${i}.href`, e.target.value)} />
                <button
                  onClick={() => {
                    const newLinks = data.header.links.filter((_, idx) => idx !== i);
                    setNestedData('header.links', newLinks);
                  }}
                  className="flex-shrink-0 text-editor-text-secondary hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setNestedData('header.links', [...(data.header.links || []), { text: 'New Link', href: '/' }])}
              className="text-xs text-editor-accent hover:underline flex items-center mt-1"
            >
              <Plus size={12} className="mr-1" /> {t('editor.controls.navigation.addLink')}
            </button>
          </>
        )}
      </div>

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Height & Hover</label>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.navigation.height')}</label>
          <span className="text-xs text-editor-text-primary">{data.header.height || 70}px</span>
        </div>
        <input
          type="range" min="50" max="120" step="5"
          value={data.header.height || 70}
          onChange={(e) => setNestedData('header.height', parseInt(e.target.value))}
          className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.hoverStyle')}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'simple', label: 'Simple' },
            { value: 'underline', label: 'Underline' },
            { value: 'bracket', label: 'Bracket' },
            { value: 'highlight', label: 'Highlight' },
            { value: 'glow', label: 'Glow' }
          ].map(style => (
            <button
              key={style.value}
              onClick={() => setNestedData('header.hoverStyle', style.value)}
              className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${data.header.hoverStyle === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.navigation.linkFontSize')}</label>
          <span className="text-xs text-editor-text-primary">{data.header.linkFontSize || 14}px</span>
        </div>
        <input
          type="range"
          min="10"
          max="24"
          step="1"
          value={data.header.linkFontSize || 14}
          onChange={(e) => setNestedData('header.linkFontSize', parseInt(e.target.value))}
          className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.ctaButton')}</label>
      <ToggleControl label={t('editor.controls.navigation.showCta')} checked={data.header.showCta !== false} onChange={(v) => setNestedData('header.showCta', v)} />

      {data.header.showCta !== false && (
        <div className="space-y-3 animate-fade-in-up">
          <Input label={t('editor.controls.navigation.buttonText')} value={data.header.ctaText || 'Get Started'} onChange={(e) => setNestedData('header.ctaText', e.target.value)} />
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.buttonRadius')}</label>
            <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
              {[{ v: 'none', l: 'None' }, { v: 'md', l: 'Med' }, { v: 'xl', l: 'Lg' }, { v: 'full', l: 'Full' }].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setNestedData('header.buttonBorderRadius', opt.v)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.header.buttonBorderRadius === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <ColorControl label="Fondo Botón" value={data.header.colors?.buttonBackground || data.header.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.buttonBackground', v)} />
          <ColorControl label="Texto Botón" value={data.header.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('header.colors.buttonText', v)} />

          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Enlace del Botón</label>
            <div className="grid grid-cols-4 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
              {[{ value: 'manual', label: 'URL' }, { value: 'product', label: 'Producto' }, { value: 'collection', label: 'Colección' }, { value: 'content', label: 'Contenido' }].map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setNestedData('header.ctaLinkType', type.value);
                    if (type.value === 'section') setNestedData('header.ctaUrl', '#cta');
                    else setNestedData('header.ctaUrl', '');
                  }}
                  className={`py-1.5 px-1 text-[10px] font-medium rounded-sm transition-colors text-center ${(data.header.ctaLinkType || 'manual') === type.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {(data.header.ctaLinkType === 'manual' || !data.header.ctaLinkType) && (
            <Input label="URL" value={data.header.ctaUrl || ''} onChange={(e) => setNestedData('header.ctaUrl', e.target.value)} placeholder="https://example.com o #seccion" />
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

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.common.colors')}</label>
      <ColorControl label={t('editor.controls.common.background')} value={data.header.colors?.background} onChange={(v) => setNestedData('header.colors.background', v)} />
      <ColorControl label={t('editor.controls.common.text')} value={data.header.colors?.text} onChange={(v) => setNestedData('header.colors.text', v)} />
      <ColorControl label={t('editor.controls.common.accent')} value={data.header.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.accent', v)} />
      {(data.header.style === 'transparent-gradient' || data.header.style === 'transparent-gradient-dark') && (
        <>
          <ColorControl
            label={data.header.style === 'transparent-gradient-dark' ? "Color Gradiente Oscuro" : "Color Gradiente Fade"}
            value={data.header.style === 'transparent-gradient-dark' ? (data.header.colors?.gradientDarkColor || '#000000') : (data.header.colors?.gradientFadeColor || data.header.colors?.text || '#ffffff')}
            onChange={(v) => setNestedData(data.header.style === 'transparent-gradient-dark' ? 'header.colors.gradientDarkColor' : 'header.colors.gradientFadeColor', v)}
          />
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-editor-text-secondary">Tamaño del Gradiente</label>
              <span className="text-xs text-editor-text-secondary/70">{data.header.gradientFadeSize ?? 30}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={data.header.gradientFadeSize ?? 30}
              onChange={(e) => setNestedData('header.gradientFadeSize', parseInt(e.target.value))}
              className="w-full accent-editor-accent"
            />
          </div>
        </>
      )}
    </div>
  )
}

// ─── ─── ─── ─── ─── ─── ───

export const renderHeaderControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.header) return null;
  const activeMenuId = data.header.menuId || '';

  const contentTab = (
    <div className="space-y-4">
      {/* ========== LOGO ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image size={14} />
          Logo
        </label>

        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Logo Type</label>
        <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border mb-3">
          {['text', 'image', 'both'].map(type => (
            <button
              key={type}
              onClick={() => setNestedData('header.logoType', type)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors capitalize ${data.header.logoType === type ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary'}`}
            >
              {type}
            </button>
          ))}
        </div>

        {(data.header.logoType === 'text' || data.header.logoType === 'both') && (
          <Input label={t('editor.controls.header.logoText')} value={data.header.logoText} onChange={(e) => setNestedData('header.logoText', e.target.value)} />
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
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.header.logoWidth')}</label>
                <span className="text-xs text-editor-text-primary">{data.header.logoWidth}px</span>
              </div>
              <input
                type="range" min="40" max="300" step="5"
                value={data.header.logoWidth}
                onChange={(e) => setNestedData('header.logoWidth', parseInt(e.target.value))}
                className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
              />
            </div>
          </div>
        )}
      </div>


      {/* ========== FAVICON ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Star size={14} />
          {t('editor.controls.header.favicon')}
        </label>

        <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-editor-border bg-editor-bg/50">
          {/* Preview */}
          <div className="relative group">
            {activeProject?.faviconUrl ? (
              <div className="relative">
                <div className="w-16 h-16 rounded-xl border-2 border-editor-border overflow-hidden flex items-center justify-center"
                  style={{ backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}>
                  <img
                    src={activeProject.faviconUrl}
                    alt="Favicon"
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <button
                  onClick={async () => {
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
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-editor-border/60 flex flex-col items-center justify-center bg-editor-bg gap-1">
                <Star size={18} className="text-editor-text-secondary/40" />
                <span className="text-[9px] text-editor-text-secondary/40 font-medium">ICO / PNG</span>
              </div>
            )}
          </div>

          <input
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

          <button
            onClick={() => faviconInputRef.current?.click()}
            disabled={isUploadingFavicon}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 bg-editor-accent/10 text-editor-accent hover:bg-editor-accent/20 border border-editor-accent/20"
          >
            {isUploadingFavicon ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-editor-accent border-t-transparent rounded-full animate-spin" />
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
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Eye size={14} />
          Visibilidad
        </label>

        <div className="space-y-3">
          <ToggleControl label={t('editor.controls.navigation.showLogin')} checked={data.header.showLogin !== false} onChange={(v) => setNestedData('header.showLogin', v)} />
          {data.header.showLogin !== false && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
              <Input label={t('editor.controls.common.text')} value={data.header.loginText || 'Login'} onChange={(e) => setNestedData('header.loginText', e.target.value)} className="mb-0" />
              <Input label={t('editor.controls.common.url')} value={data.header.loginUrl || '#'} onChange={(e) => setNestedData('header.loginUrl', e.target.value)} className="mb-0" />
            </div>
          )}
        </div>

        <div className="space-y-3 mt-3">
          <ToggleControl label={t('editor.controls.navigation.showSearch')} checked={data.header.showSearch === true} onChange={(v) => setNestedData('header.showSearch', v)} />
          {data.header.showSearch === true && (
            <div className="animate-fade-in-up">
              <Input label={t('editor.controls.navigation.placeholder')} value={data.header.searchPlaceholder || `${t('editor.controls.common.search')}...`} onChange={(e) => setNestedData('header.searchPlaceholder', e.target.value)} className="mb-0" />
            </div>
          )}
        </div>
      </div>


      {/* ========== NAVIGATION LINKS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Link size={14} />
          Enlaces de Navegación
        </label>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.source')}</label>
          <div className="flex gap-2 mb-3">
            <Select
              value={activeMenuId}
              onChange={(val) => setNestedData('header.menuId', val === '' ? undefined : val)}
              options={[
                { value: '', label: t('editor.controls.navigation.manual') },
                ...menus.map(menu => ({ value: menu.id, label: menu.title })),
              ]}
              noMargin
            />
            <button
              onClick={() => navigate(ROUTES.NAVIGATION)}
              className="p-2 bg-editor-bg border border-editor-border rounded text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-panel-bg"
              title="Manage Menus"
            >
              <Settings size={16} />
            </button>
          </div>

          {activeMenuId ? (
            <div className="p-3 bg-editor-accent/10 border border-editor-accent/20 rounded text-xs text-editor-text-primary mb-2">
              Links are currently being pulled from the <strong>{menus.find(m => m.id === activeMenuId)?.title || 'selected'}</strong> menu.
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">{t('editor.controls.navigation.customLinks')}</label>
              {(data.header.links || []).map((link, i) => (
                <div key={i} className="flex gap-2 mb-2 overflow-hidden">
                  <input className="flex-1 min-w-0 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.text} onChange={(e) => setNestedData(`header.links.${i}.text`, e.target.value)} />
                  <input className="flex-1 min-w-0 bg-editor-bg border border-editor-border rounded px-2 py-1 text-sm text-editor-text-primary" value={link.href} onChange={(e) => setNestedData(`header.links.${i}.href`, e.target.value)} />
                  <button
                    onClick={() => {
                      const newLinks = data.header.links.filter((_, idx) => idx !== i);
                      setNestedData('header.links', newLinks);
                    }}
                    className="flex-shrink-0 text-editor-text-secondary hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setNestedData('header.links', [...(data.header.links || []), { text: 'New Link', href: '/' }])}
                className="text-xs text-editor-accent hover:underline flex items-center mt-1"
              >
                <Plus size={12} className="mr-1" /> {t('editor.controls.navigation.addLink')}
              </button>
            </>
          )}
        </div>
      </div>


      {/* ========== CTA BUTTON ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <MousePointerClick size={14} />
          {t('editor.controls.navigation.ctaButton')}
        </label>

        <ToggleControl label={t('editor.controls.navigation.showCta')} checked={data.header.showCta !== false} onChange={(v) => setNestedData('header.showCta', v)} />

        {data.header.showCta !== false && (
          <div className="space-y-3 animate-fade-in-up mt-3">
            <Input label={t('editor.controls.navigation.buttonText')} value={data.header.ctaText || 'Get Started'} onChange={(e) => setNestedData('header.ctaText', e.target.value)} />

            <div>
              <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Enlace del Botón</label>
              <div className="grid grid-cols-4 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
                {[{ value: 'manual', label: 'URL' }, { value: 'product', label: 'Producto' }, { value: 'collection', label: 'Colección' }, { value: 'content', label: 'Contenido' }].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setNestedData('header.ctaLinkType', type.value);
                      if (type.value === 'section') setNestedData('header.ctaUrl', '#cta');
                      else setNestedData('header.ctaUrl', '');
                    }}
                    className={`py-1.5 px-1 text-[10px] font-medium rounded-sm transition-colors text-center ${(data.header.ctaLinkType || 'manual') === type.value ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {(data.header.ctaLinkType === 'manual' || !data.header.ctaLinkType) && (
              <Input label="URL" value={data.header.ctaUrl || ''} onChange={(e) => setNestedData('header.ctaUrl', e.target.value)} placeholder="https://example.com o #seccion" />
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
      {/* ========== DESIGN (Layout & Style) ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layout size={14} />
          Diseño
        </label>
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
              ]}
              noMargin
            />
          </div>
        </div>
      </div>


      {/* ========== OPTIONS (Sticky & Glass) ========== */}


      {/* ========== HEIGHT & HOVER ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlignJustify size={14} />
          Altura y Hover
        </label>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.navigation.height')}</label>
            <span className="text-xs text-editor-text-primary">{data.header.height || 70}px</span>
          </div>
          <input
            type="range" min="50" max="120" step="5"
            value={data.header.height || 70}
            onChange={(e) => setNestedData('header.height', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.hoverStyle')}</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'simple', label: 'Simple' },
              { value: 'underline', label: 'Underline' },
              { value: 'bracket', label: 'Bracket' },
              { value: 'highlight', label: 'Highlight' },
              { value: 'glow', label: 'Glow' }
            ].map(style => (
              <button
                key={style.value}
                onClick={() => setNestedData('header.hoverStyle', style.value)}
                className={`py-2 px-3 text-xs font-medium rounded-sm transition-colors ${data.header.hoverStyle === style.value ? 'bg-editor-accent text-editor-bg' : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">{t('editor.controls.navigation.linkFontSize')}</label>
            <span className="text-xs text-editor-text-primary">{data.header.linkFontSize || 14}px</span>
          </div>
          <input
            type="range" min="10" max="24" step="1"
            value={data.header.linkFontSize || 14}
            onChange={(e) => setNestedData('header.linkFontSize', parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>
      </div>


      {/* ========== BUTTON STYLE ========== */}
      {data.header.showCta !== false && (
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <SlidersHorizontal size={14} />
            Estilo de Botón
          </label>
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('editor.controls.navigation.buttonRadius')}</label>
          <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
            {[{ v: 'none', l: 'None' }, { v: 'md', l: 'Med' }, { v: 'xl', l: 'Lg' }, { v: 'full', l: 'Full' }].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setNestedData('header.buttonBorderRadius', opt.v)}
                className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${data.header.buttonBorderRadius === opt.v ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
              >
                {opt.l}
              </button>
            ))}
          </div>
          <div className="space-y-2 mt-3">
            <ColorControl label="Fondo Botón" value={data.header.colors?.buttonBackground || data.header.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('header.colors.buttonBackground', v)} />
            <ColorControl label="Texto Botón" value={data.header.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('header.colors.buttonText', v)} />
          </div>
        </div>
      )}


      {/* ========== COLORS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
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
                value={data.header.style === 'transparent-gradient-dark' ? (data.header.colors?.gradientDarkColor || '#000000') : (data.header.colors?.gradientFadeColor || data.header.colors?.text || '#ffffff')}
                onChange={(v) => setNestedData(data.header.style === 'transparent-gradient-dark' ? 'header.colors.gradientDarkColor' : 'header.colors.gradientFadeColor', v)}
              />
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-editor-text-secondary">Tamaño del Gradiente</label>
                  <span className="text-xs text-editor-text-secondary/70">{data.header.gradientFadeSize ?? 30}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={data.header.gradientFadeSize ?? 30}
                  onChange={(e) => setNestedData('header.gradientFadeSize', parseInt(e.target.value))}
                  className="w-full accent-editor-accent"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
