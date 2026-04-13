/**
 * FAQControls.tsx
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


export const renderFAQControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL } = deps;
const { t } = useTranslation();
  if (!data?.faq) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* FAQ Variant Selector */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">
          FAQ Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['classic', 'cards', 'gradient', 'minimal'].map((variant) => (
            <button
              key={variant}
              onClick={() => setNestedData('faq.faqVariant', variant)}
              className={`px-2 py-2 rounded-md border text-xs transition-all capitalize ${(data?.faq?.faqVariant || 'classic') === variant
                ? 'bg-editor-accent text-editor-bg border-editor-accent shadow-sm font-bold'
                : 'bg-editor-panel-bg text-editor-text-primary border-editor-border hover:border-editor-accent'
                }`}
            >
              {variant}
            </button>
          ))}
        </div>
      </div>


      {/* FAQ Items */}
      {renderListSectionControls('faq', 'Question', [{ key: 'question', label: 'Question', type: 'input' }, { key: 'answer', label: 'Answer', type: 'textarea' }])}
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="faq" />
      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Section Colors</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.faq?.colors?.background || '#1e293b'} onChange={(v) => setNestedData('faq.colors.background', v)} />
        <ColorControl label="Section Title" value={data?.faq?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('faq.colors.heading', v)} />
        <ColorControl label="Section Description" value={data?.faq?.colors?.description || data?.faq?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('faq.colors.description', v)} />
        <ColorControl label="Accent" value={data?.faq?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('faq.colors.accent', v)} />
      </div>


      {/* Card Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Card Colors</label>
        <ColorControl label="Card Background" value={data?.faq?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('faq.colors.cardBackground', v)} />
        <ColorControl label="Question Text" value={data?.faq?.colors?.text || '#F9FAFB'} onChange={(v) => setNestedData('faq.colors.text', v)} />
        <ColorControl label="Border Color" value={data?.faq?.colors?.borderColor || '#334155'} onChange={(v) => setNestedData('faq.colors.borderColor', v)} />
      </div>

      {/* Gradient Colors (for gradient variant) */}
      {(data?.faq?.faqVariant === 'gradient') && (
        <>
          <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
            <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Gradient</label>
            <ColorControl label="Gradient Start" value={data?.faq?.colors?.gradientStart || '#4f46e5'} onChange={(v) => setNestedData('faq.colors.gradientStart', v)} />
            <ColorControl label="Gradient End" value={data?.faq?.colors?.gradientEnd || '#7c3aed'} onChange={(v) => setNestedData('faq.colors.gradientEnd', v)} />
          </div>
        </>
      )}
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
