/**
 * ListSectionControls.tsx
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
import { Input, TextArea, I18nInput, I18nTextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector } from '../../ui/EditorControlPrimitives';
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


// Helper to determine list title based on section key
export const getListTitle = (t: (key: string, opts?: any) => string, sectionKey: string, itemLabel: string) => {
  switch (sectionKey) {
    case 'services': return t('editor.controls.services.services');
    case 'faq': return t('editor.controls.faq.questions');
    case 'menu': return t('editor.controls.menu.dishes');
    case 'howItWorks': return t('editor.controls.list.steps');
    default: return itemLabel + 's';
  }
};

export const renderListSectionControls = (deps: ControlsDeps, sectionKey: string, itemLabel: string, fields: { key: string, label: string, type: 'input' | 'textarea' | 'select' | 'image' | 'icon-selector', options?: string[] }[]) => {
const { data, setNestedData, t, setAiAssistField } = deps;
  if (!data) return null;
  const sectionData = (data as any)[sectionKey];
  if (!sectionData) return null;

  return (
    <div className="space-y-4">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label={t("controls.glassmorphismTransparencia", "Glassmorphism Background")}
          checked={sectionData?.glassEffect || false}
          onChange={(v) => setNestedData(`${sectionKey}.glassEffect`, v)}
        />
      </div>
      <I18nInput label={t('editor.controls.common.title')} value={sectionData.title} onChange={(val) => setNestedData(`${sectionKey}.title`, val)} />
      <FontSizeSelector label={`${t('editor.controls.common.title')} ${t('editor.controls.common.size')}`} value={sectionData.titleFontSize || 'md'} onChange={(v) => setNestedData(`${sectionKey}.titleFontSize`, v)} />

      {sectionData.description !== undefined && (
        <>
          <I18nTextArea label={t('editor.controls.common.description')} value={sectionData.description} onChange={(val) => setNestedData(`${sectionKey}.description`, val)} rows={2} />
          <FontSizeSelector label={`${t('editor.controls.common.description')} ${t('editor.controls.common.size')}`} value={sectionData.descriptionFontSize || 'md'} onChange={(v) => setNestedData(`${sectionKey}.descriptionFontSize`, v)} />
        </>
      )}

      {/* Specific Controls for some sections */}
      {sectionKey === 'howItWorks' && (
          <Select
            label={t('editor.controls.list.stepsCount')}
            value={String(sectionData.steps)}
            onChange={(val) => setNestedData(`${sectionKey}.steps`, parseInt(val))}
            options={[
              { value: '3', label: `3 ${t('editor.controls.list.steps') || 'Steps'}` },
              { value: '4', label: `4 ${t('editor.controls.list.steps') || 'Steps'}` },
            ]}
            noMargin
          />
      )}


      {/* Padding Controls */}
      {sectionData.paddingY !== undefined && sectionData.paddingX !== undefined && (
        <>
          <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
            <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('editor.controls.common.spacing')}</label>
            <div className="space-y-1">
              <PaddingSelector label={t('editor.controls.common.vertical')} value={sectionData.paddingY || 'md'} onChange={(v) => setNestedData(`${sectionKey}.paddingY`, v)} />
              <PaddingSelector label={t('editor.controls.common.horizontal')} value={sectionData.paddingX || 'md'} onChange={(v) => setNestedData(`${sectionKey}.paddingX`, v)} />
            </div>
          </div>
        </>
      )}

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{getListTitle(t, sectionKey, itemLabel)}</label>
      {(sectionData.items || []).map((item: any, index: number) => (
        <div
          key={index}
          data-section-item={`${sectionKey}:${index}`}
          className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 group"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-q-text-secondary">{itemLabel} #{index + 1}</span>
            <button type="button"               onClick={() => {
                const newItems = (sectionData.items || []).filter((_: any, i: number) => i !== index);
                setNestedData(`${sectionKey}.items`, newItems);
              }}
              className="text-q-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          {fields.map(field => (
            <div key={field.key} className="mb-2 last:mb-0">
              {field.type === 'textarea' ? (
                <I18nTextArea
                  placeholder={field.label}
                  value={item[field.key]}
                  onChange={(val) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, val)}
                  rows={2}
                />
              ) : field.type === 'icon-selector' ? (
                <IconSelector
                  label={field.label}
                  value={item[field.key]}
                  onChange={(icon) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, icon)}
                  size="sm"
                />
              ) : field.type === 'select' ? (
                <Select
                  value={item[field.key]}
                  onChange={(val) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, val)}
                  options={field.options?.map(opt => ({ value: opt, label: opt })) || []}
                  noMargin
                />
              ) : field.type === 'image' ? (
                <ImagePicker
                  label={field.label}
                  value={item[field.key]}
                  onChange={(url) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, url)}
                />
              ) : (
                <I18nInput
                  placeholder={field.label}
                  value={item[field.key]}
                  onChange={(val) => setNestedData(`${sectionKey}.items.${index}.${field.key}`, val)}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <button type="button"         onClick={() => {
          const newItem = fields.reduce((acc, field) => ({ ...acc, [field.key]: '' }), {});
          setNestedData(`${sectionKey}.items`, [...(sectionData.items || []), newItem]);
        }}
        className="w-full py-2 border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent hover:border-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus size={14} /> {t('editor.controls.list.add')} {itemLabel}
      </button>

      {sectionData.colors?.background && <ColorControl label={t('editor.controls.common.background')} value={sectionData.colors?.background} onChange={(v) => setNestedData(`${sectionKey}.colors?.background`, v)} />}
      {sectionData.colors?.heading && <ColorControl label={t('editor.controls.common.title')} value={sectionData.colors?.heading} onChange={(v) => setNestedData(`${sectionKey}.colors?.heading`, v)} />}
      {sectionData.colors?.text && <ColorControl label={t('editor.controls.common.text')} value={sectionData.colors?.text} onChange={(v) => setNestedData(`${sectionKey}.colors?.text`, v)} />}
    </div>
  )
}

