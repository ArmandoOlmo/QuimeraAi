/**
 * TopBarControls.tsx
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
import { Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector, SliderControl , I18nInput, I18nTextArea } from '../../ui/EditorControlPrimitives';
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


export const renderTopBarControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.topBar) return null;

  const topBarMessages = data.topBar.messages || [];

  const topBarIconMap: Record<string, React.ElementType> = {
    megaphone: Megaphone, tag: Tag, gift: Gift, truck: Truck, percent: Percent,
    sparkles: Sparkles, bell: Bell, info: Info, star: Star, zap: Zap,
    heart: Heart, shield: ShieldCheck, clock: Clock, flame: Flame, award: Award,
    crown: Crown, phone: Phone, mail: Mail, pin: Pin, link: Link,
  };
  const iconOptions = Object.keys(topBarIconMap);

  const contentTab = (
    <div className="space-y-3">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t("controls.glassmorphismTransparencia", "Glassmorphism Background")}
          checked={data?.topBar?.glassEffect || false}
          onChange={(v) => setNestedData("topBar.glassEffect", v)}
        />
      </div>

      <div className="text-[10px] font-semibold text-q-text-secondary uppercase tracking-wider pt-1">Messages</div>
      {topBarMessages.map((msg: any, idx: number) => (
        <div key={idx} className="bg-q-surface rounded-lg p-3 space-y-2 border border-q-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-q-text-primary">Message {idx + 1}</span>
            {topBarMessages.length > 1 && (
              <button type="button"                 onClick={() => {
                  const updated = topBarMessages.filter((_: any, i: number) => i !== idx);
                  setNestedData('topBar.messages', updated);
                }}
                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                title="Remove"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Icon selector */}
          <div>
            <div className="text-[10px] font-medium text-q-text-secondary mb-1">Icon</div>
            <div className="grid grid-cols-7 gap-1">
              <button type="button"                 onClick={() => setNestedData(`topBar.messages.${idx}.icon`, '')}
                className={`p-1.5 rounded flex items-center justify-center ${!msg.icon ? 'bg-blue-500/20 ring-1 ring-blue-500' : 'bg-q-bg hover:hover:bg-q-surface-overlay'}`}
                title="No icon"
              >
                <X size={14} />
              </button>
              {iconOptions.map(ic => {
                const isActive = msg.icon === ic;
                const IconComp = topBarIconMap[ic];
                return (
                  <button type="button"                     key={ic}
                    onClick={() => setNestedData(`topBar.messages.${idx}.icon`, ic)}
                    className={`p-1.5 rounded flex items-center justify-center ${isActive ? 'bg-blue-500/20 ring-1 ring-blue-500' : 'bg-q-bg hover:hover:bg-q-surface-overlay'}`}
                    title={ic}
                  >
                    <IconComp size={14} />
                  </button>
                );
              })}
            </div>
          </div>

          <I18nInput label={t('controls.text')} value={msg.text || ''} onChange={(val) => setNestedData(`topBar.messages.${idx}.text`, val)} />
          <I18nInput label={t('controls.linkText')} value={msg.linkText || ''} onChange={(val) => setNestedData(`topBar.messages.${idx}.linkText`, val)} placeholder="Shop Now" />

          {/* Link Type Selector */}
          <div>
            <div className="text-[10px] font-medium text-q-text-secondary mb-1">Link Destination</div>
            <div className="flex bg-q-bg rounded-md border border-q-border p-0.5 mb-2">
              {[
                { value: 'manual', label: 'URL' },
                { value: 'content', label: 'Content' },
              ].map(type => (
                <button type="button"                   key={type.value}
                  onClick={() => setNestedData(`topBar.messages.${idx}.linkType`, type.value)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(msg.linkType || 'manual') === type.value
                    ? 'bg-q-accent text-q-bg'
                    : 'text-q-text-secondary hover:text-q-text-primary hover:hover:bg-q-surface-overlay'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {(msg.linkType === 'manual' || !msg.linkType) && (
              <I18nInput label={t('controls.linkUrl')} value={msg.link || ''} onChange={(val) => setNestedData(`topBar.messages.${idx}.link`, val)} placeholder="#section or /page or https://..." />
            )}
            {msg.linkType === 'content' && (
              <SingleContentSelector
                selectedContentPath={msg.link}
                onSelect={(path) => setNestedData(`topBar.messages.${idx}.link`, path || '')}
                label={t('controls.selectContent')}
              />
            )}
          </div>
        </div>
      ))}

      <button type="button"         onClick={() => {
          const newMsg = { text: 'New announcement', icon: 'sparkles', link: '', linkText: '' };
          setNestedData('topBar.messages', [...topBarMessages, newMsg]);
        }}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium transition-colors"
      >
        <PlusCircle size={14} /> Add Message
      </button>
    </div>
  );

  const styleTab = (
    <div className="space-y-3">      {/* Position */}
      <div className="text-[10px] font-semibold text-q-text-secondary uppercase tracking-wider pt-1">Position</div>
      <ToggleControl label={t('controls.aboveHeader')} checked={data.topBar.aboveHeader ?? true} onChange={(v) => setNestedData('topBar.aboveHeader', v)} />
      <p className="text-[10px] text-q-text-secondary -mt-1">
        {data.topBar.aboveHeader ? 'Pinned above navigation bar' : 'Placed in content flow'}
      </p>

      <div className="text-[10px] font-semibold text-q-text-secondary uppercase tracking-wider pt-1">Behavior</div>
      <ToggleControl label={t('controls.scrollMarquee')} checked={data.topBar.scrollEnabled ?? false} onChange={(v) => setNestedData('topBar.scrollEnabled', v)} />
      <ToggleControl label={t('controls.pauseOnHover')} checked={data.topBar.pauseOnHover ?? true} onChange={(v) => setNestedData('topBar.pauseOnHover', v)} />
      <ToggleControl label={t('controls.dismissible')} checked={data.topBar.dismissible ?? true} onChange={(v) => setNestedData('topBar.dismissible', v)} />

      {data.topBar.scrollEnabled ? (
        <div className="mb-4">
          <SliderControl
            label="Scroll Speed"
            value={data.topBar.scrollSpeed || 30}
            onChange={(v) => setNestedData('topBar.scrollSpeed', v)}
            min={5} max={60} step={5} suffix="s"
          />
        </div>
      ) : (
        <>
          <ToggleControl label={t('controls.showArrows')} checked={data.topBar.showRotatingArrows ?? true} onChange={(v) => setNestedData('topBar.showRotatingArrows', v)} />
            <SliderControl
              label="Rotate Speed"
              value={data.topBar.rotateSpeed || 4000}
              onChange={(v) => setNestedData('topBar.rotateSpeed', v)}
              min={1000} max={10000} step={500}
              formatValue={(val) => `${(val / 1000).toFixed(1)}s`}
            />
        </>
      )}

      <FontSizeSelector label={t('controls.fontSize')} value={data.topBar.fontSize || 'sm'} onChange={(v) => setNestedData('topBar.fontSize', v)} />

      {/* Height Slider */}
      <div className="mb-4">
        <SliderControl
          label="Bar Height"
          value={data.topBar.height || 40}
          onChange={(v) => setNestedData('topBar.height', v)}
          min={20} max={120} step={1} suffix="px"
        />
      </div>

      {/* Separator */}
      <div>
        <div className="text-[10px] font-medium text-q-text-secondary mb-1">Separator</div>
        <div className="flex gap-1">
          {[
            { value: 'dot', label: '•' },
            { value: 'pipe', label: '|' },
            { value: 'star', label: '★' },
            { value: 'none', label: 'None' },
          ].map(opt => (
            <button type="button"               key={opt.value}
              onClick={() => setNestedData('topBar.separator', opt.value)}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                (data.topBar.separator || 'dot') === opt.value
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500'
                  : 'bg-q-bg text-q-text-secondary hover:hover:bg-q-surface-overlay'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="text-[10px] font-semibold text-q-text-secondary uppercase tracking-wider pt-1">Background</div>
      <ToggleControl label={t('controls.useGradient')} checked={data.topBar.useGradient ?? false} onChange={(v) => setNestedData('topBar.useGradient', v)} />

      {data.topBar.useGradient ? (
        <div className="space-y-2">
          <ColorControl label={t('controls.gradientFrom')} value={data.topBar.gradientFrom || '#4f46e5'} onChange={(v) => setNestedData('topBar.gradientFrom', v)} />
          <ColorControl label={t('controls.gradientTo')} value={data.topBar.gradientTo || '#7c3aed'} onChange={(v) => setNestedData('topBar.gradientTo', v)} />
            <SliderControl
              label="Gradient Angle"
              value={data.topBar.gradientAngle ?? 90}
              onChange={(v) => setNestedData('topBar.gradientAngle', v)}
              min={0} max={360} step={15} suffix="°"
            />
        </div>
      ) : (
        <ColorControl label={t('controls.backgroundColor')} value={data.topBar.backgroundColor || '#1a1a1a'} onChange={(v) => setNestedData('topBar.backgroundColor', v)} />
      )}

      {/* Colors */}
      <div className="text-[10px] font-semibold text-q-text-secondary uppercase tracking-wider pt-1">Colors</div>
      <ColorControl label={t('controls.text')} value={data.topBar.textColor || '#ffffff'} onChange={(v) => setNestedData('topBar.textColor', v)} />
      <ColorControl label={t('controls.link')} value={data.topBar.linkColor || '#fbbf24'} onChange={(v) => setNestedData('topBar.linkColor', v)} />
      <ColorControl label={t('controls.icon')} value={data.topBar.iconColor || '#fbbf24'} onChange={(v) => setNestedData('topBar.iconColor', v)} />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
