/**
 * LogoBannerControls.tsx
 * Section controls extracted from Controls.tsx
 */
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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


export const renderLogoBannerControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL } = deps;
const { t } = useTranslation();
  if (!data?.logoBanner) return null;

  const logos = data.logoBanner.logos || [];

  const contentTab = (
    <div className="space-y-3">
      <Input label="Title" value={data.logoBanner.title || ''} onChange={(e) => setNestedData('logoBanner.title', e.target.value)} placeholder="Trusted by industry leaders" />
      <Input label="Subtitle" value={data.logoBanner.subtitle || ''} onChange={(e) => setNestedData('logoBanner.subtitle', e.target.value)} placeholder="" />

      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Logos</div>
      {logos.map((logo: any, idx: number) => (
        <div key={idx} className="bg-editor-card rounded-lg p-3 space-y-2 border border-editor-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-editor-text-primary">Logo {idx + 1}</span>
            {logos.length > 1 && (
              <button
                onClick={() => {
                  const updated = logos.filter((_: any, i: number) => i !== idx);
                  setNestedData('logoBanner.logos', updated);
                }}
                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                title="Remove"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <ImagePicker
            label="Logo Image"
            value={logo.imageUrl}
            onChange={(url) => setNestedData(`logoBanner.logos.${idx}.imageUrl`, url)}
          />
          <Input label="Alt Text" value={logo.alt || ''} onChange={(e) => setNestedData(`logoBanner.logos.${idx}.alt`, e.target.value)} placeholder="Brand Name" />
          <Input label="Link Text" value={logo.linkText || ''} onChange={(e) => setNestedData(`logoBanner.logos.${idx}.linkText`, e.target.value)} placeholder="Visit Brand" />

          {/* Link Type Selector */}
          <div>
            <div className="text-[10px] font-medium text-editor-text-secondary mb-1">Link Destination</div>
            <div className="flex bg-editor-bg rounded-md border border-editor-border p-0.5 mb-2">
              {[
                { value: 'manual', label: 'URL' },
                { value: 'content', label: 'Content' },
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setNestedData(`logoBanner.logos.${idx}.linkType`, type.value)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(logo.linkType || 'manual') === type.value
                    ? 'bg-editor-accent text-editor-bg'
                    : 'text-editor-text-secondary hover:text-editor-text-primary hover:bg-editor-hover'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {(logo.linkType === 'manual' || !logo.linkType) && (
              <Input label="Link URL" value={logo.link || ''} onChange={(e) => setNestedData(`logoBanner.logos.${idx}.link`, e.target.value)} placeholder="https://brand.com" />
            )}
            {logo.linkType === 'content' && (
              <SingleContentSelector
                selectedContentPath={logo.link}
                onSelect={(path) => setNestedData(`logoBanner.logos.${idx}.link`, path || '')}
                label="Select Content"
              />
            )}
          </div>
        </div>
      ))}

      <button
        onClick={() => {
          const newLogo = { imageUrl: '', alt: `Brand ${logos.length + 1}`, link: '', linkText: '' };
          setNestedData('logoBanner.logos', [...logos, newLogo]);
        }}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium transition-colors"
      >
        <PlusCircle size={14} /> Add Logo
      </button>
    </div>
  );

  const styleTab = (
    <div className="space-y-3">
      {/* Scroll */}
      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Behavior</div>
      <ToggleControl label="Scroll (Marquee)" checked={data.logoBanner.scrollEnabled ?? false} onChange={(v) => setNestedData('logoBanner.scrollEnabled', v)} />
      <ToggleControl label="Pause on Hover" checked={data.logoBanner.pauseOnHover ?? true} onChange={(v) => setNestedData('logoBanner.pauseOnHover', v)} />
      <ToggleControl label="Grayscale (Color on Hover)" checked={data.logoBanner.grayscale ?? true} onChange={(v) => setNestedData('logoBanner.grayscale', v)} />
      <ToggleControl label="Show Divider Lines" checked={data.logoBanner.showDivider ?? false} onChange={(v) => setNestedData('logoBanner.showDivider', v)} />

      {data.logoBanner.scrollEnabled && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-editor-text-secondary">Scroll Speed</span>
            <span className="text-xs text-editor-text-primary">{data.logoBanner.scrollSpeed || 25}s</span>
          </div>
          <input type="range" min={5} max={60} step={5}
            value={data.logoBanner.scrollSpeed || 25}
            onChange={(e) => setNestedData('logoBanner.scrollSpeed', parseInt(e.target.value))}
            className="w-full accent-blue-500" />
        </div>
      )}

      {/* Logo Size */}
      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Logo Size</div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-editor-text-secondary">Logo Height</span>
          <span className="text-xs text-editor-text-primary">{data.logoBanner.logoHeight || 40}px</span>
        </div>
        <input type="range" min={20} max={100} step={5}
          value={data.logoBanner.logoHeight || 40}
          onChange={(e) => setNestedData('logoBanner.logoHeight', parseInt(e.target.value))}
          className="w-full accent-blue-500" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-editor-text-secondary">Gap Between Logos</span>
          <span className="text-xs text-editor-text-primary">{data.logoBanner.logoGap || 48}px</span>
        </div>
        <input type="range" min={16} max={96} step={8}
          value={data.logoBanner.logoGap || 48}
          onChange={(e) => setNestedData('logoBanner.logoGap', parseInt(e.target.value))}
          className="w-full accent-blue-500" />
      </div>

      {/* Font sizes */}
      <FontSizeSelector label="Title Size" value={data.logoBanner.titleFontSize || 'sm'} onChange={(v) => setNestedData('logoBanner.titleFontSize', v)} />
      <FontSizeSelector label="Subtitle Size" value={data.logoBanner.subtitleFontSize || 'sm'} onChange={(v) => setNestedData('logoBanner.subtitleFontSize', v)} />

      {/* Padding */}
      <div>
        <div className="text-[10px] font-medium text-editor-text-secondary mb-1">Padding</div>
        <div className="flex gap-1">
          {[
            { value: 'sm', label: 'S' },
            { value: 'md', label: 'M' },
            { value: 'lg', label: 'L' },
            { value: 'xl', label: 'XL' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setNestedData('logoBanner.paddingY', opt.value)}
              className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                (data.logoBanner.paddingY || 'md') === opt.value
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500'
                  : 'bg-editor-bg text-editor-text-secondary hover:bg-editor-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Background</div>
      <ToggleControl label="Use Gradient" checked={data.logoBanner.useGradient ?? false} onChange={(v) => setNestedData('logoBanner.useGradient', v)} />

      {data.logoBanner.useGradient ? (
        <div className="space-y-2">
          <ColorControl label="Gradient From" value={data.logoBanner.gradientFrom || '#0f172a'} onChange={(v) => setNestedData('logoBanner.gradientFrom', v)} />
          <ColorControl label="Gradient To" value={data.logoBanner.gradientTo || '#1e293b'} onChange={(v) => setNestedData('logoBanner.gradientTo', v)} />
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-editor-text-secondary">Gradient Angle</span>
              <span className="text-xs text-editor-text-primary">{data.logoBanner.gradientAngle ?? 90}°</span>
            </div>
            <input type="range" min={0} max={360} step={15}
              value={data.logoBanner.gradientAngle ?? 90}
              onChange={(e) => setNestedData('logoBanner.gradientAngle', parseInt(e.target.value))}
              className="w-full accent-blue-500" />
          </div>
        </div>
      ) : (
        <ColorControl label="Background Color" value={data.logoBanner.backgroundColor || '#ffffff'} onChange={(v) => setNestedData('logoBanner.backgroundColor', v)} />
      )}

      {/* Colors */}
      <div className="text-[10px] font-semibold text-editor-text-secondary uppercase tracking-wider pt-1">Colors</div>
      <ColorControl label="Title" value={data.logoBanner.titleColor || '#64748b'} onChange={(v) => setNestedData('logoBanner.titleColor', v)} />
      <ColorControl label="Subtitle" value={data.logoBanner.subtitleColor || '#94a3b8'} onChange={(v) => setNestedData('logoBanner.subtitleColor', v)} />
      {data.logoBanner.showDivider && (
        <ColorControl label="Divider" value={data.logoBanner.dividerColor || '#e2e8f0'} onChange={(v) => setNestedData('logoBanner.dividerColor', v)} />
      )}
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
