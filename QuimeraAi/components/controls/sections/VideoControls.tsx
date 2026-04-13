/**
 * VideoControls.tsx
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


export const renderVideoControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL } = deps;
  if (!data?.video) return null;
  return (
    <div className="space-y-4">
      <Input label={t('editor.controls.common.title')} value={data.video.title} onChange={(e) => setNestedData('video.title', e.target.value)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.video.titleFontSize || 'md'} onChange={(v) => setNestedData('video.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data.video.description} onChange={(e) => setNestedData('video.description', e.target.value)} rows={2} />
      <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.video.descriptionFontSize || 'md'} onChange={(v) => setNestedData('video.descriptionFontSize', v)} />

      <div>
        <Select
          label="Source"
          value={data.video.source}
          onChange={(val) => setNestedData('video.source', val)}
          options={[
            { value: 'youtube', label: 'YouTube' },
            { value: 'vimeo', label: 'Vimeo' },
            { value: 'upload', label: 'Direct URL' },
          ]}
          noMargin
        />
      </div>
      {data.video.source === 'upload' ? (
        <Input label="Video URL" value={data.video.videoUrl} onChange={(e) => setNestedData('video.videoUrl', e.target.value)} />
      ) : (
        <Input
          label={data.video.source === 'youtube' ? 'YouTube URL or Video ID' : 'Vimeo URL or Video ID'}
          value={data.video.videoId}
          onChange={(e) => setNestedData('video.videoId', extractVideoId(e.target.value, data.video.source))}
          placeholder={data.video.source === 'youtube' ? 'https://www.youtube.com/watch?v=... or dQw4w9WgXcQ' : 'https://vimeo.com/123456789 or 123456789'}
        />
      )}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <ToggleControl label="Autoplay (Muted)" checked={data.video.autoplay} onChange={(v) => setNestedData('video.autoplay', v)} />
        <ToggleControl label={t('editor.controls.common.loop')} checked={data.video.loop} onChange={(v) => setNestedData('video.loop', v)} />
        <ToggleControl label={t('editor.controls.common.showControls')} checked={data.video.showControls} onChange={(v) => setNestedData('video.showControls', v)} />
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
        <div className="space-y-1">
          <PaddingSelector label="Vertical" value={data.video.paddingY || 'md'} onChange={(v) => setNestedData('video.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data.video.paddingX || 'md'} onChange={(v) => setNestedData('video.paddingX', v)} />
        </div>
      </div>

      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Colors</label>
      <ColorControl label={t('editor.controls.common.background')} value={data.video.colors?.background} onChange={(v) => setNestedData('video.colors.background', v)} />
      <ColorControl label={t('editor.controls.common.title')} value={data.video.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('video.colors.heading', v)} />
      <ColorControl label="Text" value={data.video.colors?.text} onChange={(v) => setNestedData('video.colors.text', v)} />


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data.video.cornerGradient?.enabled || false}
        position={data.video.cornerGradient?.position || 'top-left'}
        color={data.video.cornerGradient?.color || '#4f46e5'}
        opacity={data.video.cornerGradient?.opacity || 30}
        size={data.video.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('video.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('video.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('video.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('video.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('video.cornerGradient.size', v)}
      />
    </div>
  )
}

// ─── ─── ─── ─── ─── ─── ───

export const renderVideoControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL } = deps;
  if (!data?.video) return null;

  const contentTab = (
    <div className="space-y-4">
      <Input label={t('editor.controls.common.title')} value={data.video.title} onChange={(e) => setNestedData('video.title', e.target.value)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.video.titleFontSize || 'md'} onChange={(v) => setNestedData('video.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data.video.description} onChange={(e) => setNestedData('video.description', e.target.value)} rows={2} />
      <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.video.descriptionFontSize || 'md'} onChange={(v) => setNestedData('video.descriptionFontSize', v)} />


      <div>
        <Select
          label="Source"
          value={data.video.source}
          onChange={(val) => setNestedData('video.source', val)}
          options={[
            { value: 'youtube', label: 'YouTube' },
            { value: 'vimeo', label: 'Vimeo' },
            { value: 'upload', label: 'Direct URL' },
          ]}
          noMargin
        />
      </div>
      {data.video.source === 'upload' ? (
        <Input label="Video URL" value={data.video.videoUrl} onChange={(e) => setNestedData('video.videoUrl', e.target.value)} />
      ) : (
        <Input
          label={data.video.source === 'youtube' ? 'YouTube URL or Video ID' : 'Vimeo URL or Video ID'}
          value={data.video.videoId}
          onChange={(e) => setNestedData('video.videoId', extractVideoId(e.target.value, data.video.source))}
          placeholder={data.video.source === 'youtube' ? 'https://www.youtube.com/watch?v=... or dQw4w9WgXcQ' : 'https://vimeo.com/123456789 or 123456789'}
        />
      )}


      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Playback Options</label>
        <ToggleControl label="Autoplay (Muted)" checked={data.video.autoplay} onChange={(v) => setNestedData('video.autoplay', v)} />
        <ToggleControl label={t('editor.controls.common.loop')} checked={data.video.loop} onChange={(v) => setNestedData('video.loop', v)} />
        <ToggleControl label={t('editor.controls.common.showControls')} checked={data.video.showControls} onChange={(v) => setNestedData('video.showControls', v)} />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="video" />
      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Spacing</label>
        <div className="grid grid-cols-2 gap-3">
          <PaddingSelector label="Vertical" value={data.video.paddingY || 'md'} onChange={(v) => setNestedData('video.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data.video.paddingX || 'md'} onChange={(v) => setNestedData('video.paddingX', v)} />
        </div>
      </div>


      {/* Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Colors</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.video.colors?.background} onChange={(v) => setNestedData('video.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.video.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('video.colors.heading', v)} />
        <ColorControl label="Text" value={data.video.colors?.text} onChange={(v) => setNestedData('video.colors.text', v)} />
      </div>


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data.video.cornerGradient?.enabled || false}
        position={data.video.cornerGradient?.position || 'top-left'}
        color={data.video.cornerGradient?.color || '#4f46e5'}
        opacity={data.video.cornerGradient?.opacity || 30}
        size={data.video.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('video.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('video.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('video.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('video.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('video.cornerGradient.size', v)}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
