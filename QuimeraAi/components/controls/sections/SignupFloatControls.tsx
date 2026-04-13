/**
 * SignupFloatControls.tsx
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


export const renderSignupFloatControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL } = deps;
  if (!data?.signupFloat) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* ========== IMAGE ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image size={14} />
          {t('editor.controls.common.image')}
        </label>
        <ImagePicker
          label={t('editor.controls.common.image')}
          value={data.signupFloat.imageUrl || ''}
          onChange={(url) => setNestedData('signupFloat.imageUrl', url)}
        />
        {/* Image Placement */}
        <div className="mt-3">
          <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
            {t('controls.signupFloat.imagePlacement', 'Image Position')}
          </label>
          <div className="grid grid-cols-4 gap-1 bg-editor-bg p-1 rounded-md border border-editor-border">
            {(['top', 'right', 'bottom', 'left'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setNestedData('signupFloat.imagePlacement', pos)}
                className={`py-1.5 text-xs font-medium rounded-sm transition-colors flex items-center justify-center gap-1 ${
                  (data.signupFloat.imagePlacement || 'top') === pos
                    ? 'bg-editor-accent text-editor-bg'
                    : 'text-editor-text-secondary hover:bg-editor-border'
                }`}
              >
                {pos === 'top' && <ChevronUp size={12} />}
                {pos === 'bottom' && <ChevronDown size={12} />}
                {pos === 'left' && <ChevronLeft size={12} />}
                {pos === 'right' && <ChevronRight size={12} />}
                {t(`controls.signupFloat.${pos}`, pos.charAt(0).toUpperCase() + pos.slice(1))}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========== CONTENT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          {t('controls.content', 'Content')}
        </label>
        <Input label={t('controls.signupFloat.headerText', 'Header Text')} value={data.signupFloat.headerText || ''} onChange={(e) => setNestedData('signupFloat.headerText', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.signupFloat.headerFontSize || 'lg'} onChange={(v) => setNestedData('signupFloat.headerFontSize', v)} />
        <TextArea label={t('editor.controls.common.description')} value={data.signupFloat.descriptionText || ''} onChange={(e) => setNestedData('signupFloat.descriptionText', e.target.value)} rows={3} />
        <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.signupFloat.descriptionFontSize || 'sm'} onChange={(v) => setNestedData('signupFloat.descriptionFontSize', v)} />
      </div>

      {/* ========== FORM FIELDS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Mail size={14} />
          {t('controls.signupFloat.formFields', 'Form Fields')}
        </label>
        <div className="space-y-2 mb-3">
          <ToggleControl label={t('controls.signupFloat.showName', 'Show Name Field')} checked={data.signupFloat.showNameField !== false} onChange={(v) => setNestedData('signupFloat.showNameField', v)} />
          <ToggleControl label={t('controls.signupFloat.showEmail', 'Show Email Field')} checked={data.signupFloat.showEmailField !== false} onChange={(v) => setNestedData('signupFloat.showEmailField', v)} />
          <ToggleControl label={t('controls.signupFloat.showPhone', 'Show Phone Field')} checked={data.signupFloat.showPhoneField === true} onChange={(v) => setNestedData('signupFloat.showPhoneField', v)} />
          <ToggleControl label={t('controls.signupFloat.showMessage', 'Show Message Field')} checked={data.signupFloat.showMessageField === true} onChange={(v) => setNestedData('signupFloat.showMessageField', v)} />
        </div>
        {data.signupFloat.showNameField !== false && (
          <Input label={t('controls.signupFloat.namePlaceholder', 'Name Placeholder')} value={data.signupFloat.namePlaceholder || ''} onChange={(e) => setNestedData('signupFloat.namePlaceholder', e.target.value)} />
        )}
        {data.signupFloat.showEmailField !== false && (
          <Input label={t('controls.signupFloat.emailPlaceholder', 'Email Placeholder')} value={data.signupFloat.emailPlaceholder || ''} onChange={(e) => setNestedData('signupFloat.emailPlaceholder', e.target.value)} />
        )}
        {data.signupFloat.showPhoneField && (
          <Input label={t('controls.signupFloat.phonePlaceholder', 'Phone Placeholder')} value={data.signupFloat.phonePlaceholder || ''} onChange={(e) => setNestedData('signupFloat.phonePlaceholder', e.target.value)} />
        )}
        {data.signupFloat.showMessageField && (
          <Input label={t('controls.signupFloat.messagePlaceholder', 'Message Placeholder')} value={data.signupFloat.messagePlaceholder || ''} onChange={(e) => setNestedData('signupFloat.messagePlaceholder', e.target.value)} />
        )}
        <Input label={t('editor.controls.common.buttonText')} value={data.signupFloat.buttonText || ''} onChange={(e) => setNestedData('signupFloat.buttonText', e.target.value)} />
      </div>

      {/* ========== SOCIAL LINKS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Share2 size={14} />
          {t('controls.signupFloat.socialLinks', 'Social Links')}
        </label>
        <ToggleControl label={t('controls.signupFloat.showSocial', 'Show Social Links')} checked={data.signupFloat.showSocialLinks !== false} onChange={(v) => setNestedData('signupFloat.showSocialLinks', v)} />
        {data.signupFloat.showSocialLinks !== false && (
          <div className="mt-3">
            <SocialLinksEditor
              socialLinks={data.signupFloat.socialLinks || []}
              onUpdate={(newLinks) => setNestedData('signupFloat.socialLinks', newLinks)}
              onUpdateHref={(index, href) => setNestedData(`signupFloat.socialLinks.${index}.href`, href)}
            />
          </div>
        )}
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== FLOAT POSITION ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layout size={14} />
          {t('controls.signupFloat.floatPosition', 'Float Position')}
        </label>
        <div className="grid grid-cols-3 gap-2 bg-editor-bg p-2 rounded-lg border border-editor-border">
          {/* Top row */}
          <button
            onClick={() => setNestedData('signupFloat.floatPosition', 'top-left')}
            className={`p-2 text-xs font-medium rounded transition-colors ${data.signupFloat.floatPosition === 'top-left' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
          >↖ TL</button>
          <div /> {/* Empty center-top */}
          <button
            onClick={() => setNestedData('signupFloat.floatPosition', 'top-right')}
            className={`p-2 text-xs font-medium rounded transition-colors ${data.signupFloat.floatPosition === 'top-right' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
          >↗ TR</button>
          {/* Middle row */}
          <div />
          <button
            onClick={() => setNestedData('signupFloat.floatPosition', 'center')}
            className={`p-2 text-xs font-medium rounded transition-colors ${data.signupFloat.floatPosition === 'center' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
          >⊙ {t('controls.signupFloat.center', 'Center')}</button>
          <div />
          {/* Bottom row */}
          <button
            onClick={() => setNestedData('signupFloat.floatPosition', 'bottom-left')}
            className={`p-2 text-xs font-medium rounded transition-colors ${data.signupFloat.floatPosition === 'bottom-left' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
          >↙ BL</button>
          <div />
          <button
            onClick={() => setNestedData('signupFloat.floatPosition', 'bottom-right')}
            className={`p-2 text-xs font-medium rounded transition-colors ${(data.signupFloat.floatPosition || 'bottom-right') === 'bottom-right' ? 'bg-editor-accent text-editor-bg' : 'text-editor-text-secondary hover:bg-editor-border'}`}
          >↘ BR</button>
        </div>
      </div>

      {/* ========== BEHAVIOR ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings size={14} />
          {t('controls.signupFloat.behavior', 'Behavior')}
        </label>
        <div className="space-y-2">
          <ToggleControl label={t('controls.signupFloat.showOnLoad', 'Show On Load')} checked={data.signupFloat.showOnLoad !== false} onChange={(v) => setNestedData('signupFloat.showOnLoad', v)} />
          <ToggleControl label={t('controls.signupFloat.showClose', 'Show Close Button')} checked={data.signupFloat.showCloseButton !== false} onChange={(v) => setNestedData('signupFloat.showCloseButton', v)} />
          <ToggleControl label={t('controls.signupFloat.minimizeOnClose', 'Minimize On Close')} checked={data.signupFloat.minimizeOnClose !== false} onChange={(v) => setNestedData('signupFloat.minimizeOnClose', v)} />
        </div>
        {data.signupFloat.minimizeOnClose !== false && (
          <div className="mt-3">
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
              {t('controls.signupFloat.minimizedLabel', 'Minimized Button Label')}
            </label>
            <input
              type="text"
              value={data.signupFloat.minimizedLabel || '✉️ Sign Up'}
              onChange={(e) => setNestedData('signupFloat.minimizedLabel', e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-editor-bg border border-editor-border text-sm text-editor-text-primary placeholder-editor-text-secondary focus:outline-none focus:ring-1 focus:ring-editor-accent"
            />
          </div>
        )}
        <div className="mt-3">
          <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
            {t('controls.signupFloat.triggerDelay', 'Delay (seconds)')}: {data.signupFloat.triggerDelay ?? 3}s
          </label>
          <input type="range" min="0" max="30" step="1" value={data.signupFloat.triggerDelay ?? 3} onChange={(e) => setNestedData('signupFloat.triggerDelay', parseInt(e.target.value))} className="w-full accent-editor-accent" />
        </div>
      </div>

      {/* ========== DIMENSIONS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Maximize2 size={14} />
          {t('controls.signupFloat.dimensions', 'Dimensions')}
        </label>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
              {t('controls.signupFloat.width', 'Width')}: {data.signupFloat.width ?? 400}px
            </label>
            <input type="range" min="300" max="600" step="10" value={data.signupFloat.width ?? 400} onChange={(e) => setNestedData('signupFloat.width', parseInt(e.target.value))} className="w-full accent-editor-accent" />
          </div>
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
              {t('controls.signupFloat.imageHeight', 'Image Height')}: {data.signupFloat.imageHeight ?? 200}px
            </label>
            <input type="range" min="100" max="400" step="10" value={data.signupFloat.imageHeight ?? 200} onChange={(e) => setNestedData('signupFloat.imageHeight', parseInt(e.target.value))} className="w-full accent-editor-accent" />
          </div>
          <BorderRadiusSelector label={t('editor.controls.common.borderRadius')} value={data.signupFloat.borderRadius || 'xl'} onChange={(v) => setNestedData('signupFloat.borderRadius', v)} />
          <BorderRadiusSelector label={t('editor.controls.common.buttonBorderRadius')} value={data.signupFloat.buttonBorderRadius || 'lg'} onChange={(v) => setNestedData('signupFloat.buttonBorderRadius', v)} />
        </div>
      </div>

      {/* ========== COLORS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Palette size={14} />
          {t('editor.controls.common.colors')}
        </label>
        <div className="space-y-2">
          <ColorControl label={t('editor.controls.common.background')} value={data.signupFloat.colors?.background || '#1e293b'} onChange={(v) => setNestedData('signupFloat.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.signupFloat.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('signupFloat.colors.heading', v)} />
          <ColorControl label={t('editor.controls.common.text')} value={data.signupFloat.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('signupFloat.colors.text', v)} />
          <ColorControl label="Accent" value={data.signupFloat.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('signupFloat.colors.accent', v)} />
        </div>
      </div>

      {/* ========== BUTTON COLORS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3">
          Button
        </label>
        <div className="space-y-2">
          <ColorControl label="Button Background" value={data.signupFloat.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('signupFloat.colors.buttonBackground', v)} />
          <ColorControl label={t('editor.controls.common.buttonText')} value={data.signupFloat.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('signupFloat.colors.buttonText', v)} />
        </div>
      </div>

      {/* ========== INPUT COLORS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3">
          Input Fields
        </label>
        <div className="space-y-2">
          <ColorControl label="Input Background" value={data.signupFloat.colors?.inputBackground || '#0f172a'} onChange={(v) => setNestedData('signupFloat.colors.inputBackground', v)} />
          <ColorControl label="Input Text" value={data.signupFloat.colors?.inputText || '#F9FAFB'} onChange={(v) => setNestedData('signupFloat.colors.inputText', v)} />
          <ColorControl label="Input Border" value={data.signupFloat.colors?.inputBorder || '#334155'} onChange={(v) => setNestedData('signupFloat.colors.inputBorder', v)} />
          <ColorControl label="Placeholder" value={data.signupFloat.colors?.inputPlaceholder || '#6b7280'} onChange={(v) => setNestedData('signupFloat.colors.inputPlaceholder', v)} />
        </div>
      </div>

      {/* ========== SOCIAL & OVERLAY COLORS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3">
          {t('controls.signupFloat.socialLinks', 'Social Links')} & Overlay
        </label>
        <div className="space-y-2">
          <ColorControl label="Social Icon Color" value={data.signupFloat.colors?.socialIconColor || '#94a3b8'} onChange={(v) => setNestedData('signupFloat.colors.socialIconColor', v)} />
          <ColorControl label="Overlay Background" value={data.signupFloat.colors?.overlayBackground || 'rgba(0,0,0,0.4)'} onChange={(v) => setNestedData('signupFloat.colors.overlayBackground', v)} />
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
