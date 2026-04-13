/**
 * ProductsControls.tsx
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


export const renderProductsControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL } = deps;
const { t } = useTranslation();
  if (!data?.products) return null;

  const contentTab = (
    <div className="space-y-4">
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Type size={14} />
          Content
        </label>
        <Input label={t('editor.controls.common.title')} value={data?.products?.title || 'Nuestros Productos'} onChange={(e) => setNestedData('products.title', e.target.value)} />
        <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.products?.titleFontSize || 'lg'} onChange={(v) => setNestedData('products.titleFontSize', v)} />
        <TextArea label={t('editor.controls.common.subtitle')} value={data?.products?.subtitle || ''} onChange={(e) => setNestedData('products.subtitle', e.target.value)} rows={2} />
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-xs text-blue-400 flex items-start gap-2">
          <Info size={14} className="mt-0.5 flex-shrink-0" />
          <span>Products are loaded from your Ecommerce store. Go to the Ecommerce Dashboard to add and manage products.</span>
        </p>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* Layout */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Layout size={14} />
          Layout
        </label>
        <div className="space-y-3">
          <div>
            <Select
              label="Style"
              value={data?.products?.style || 'modern'}
              onChange={(val) => setNestedData('products.style', val)}
              options={[
                { value: 'minimal', label: 'Minimal' },
                { value: 'modern', label: 'Modern' },
                { value: 'elegant', label: 'Elegant' },
                { value: 'dark', label: 'Dark' },
              ]}
              noMargin
            />
          </div>
          <div>
            <Select
              label="Columns"
              value={String(data?.products?.columns || 4)}
              onChange={(val) => setNestedData('products.columns', parseInt(val))}
              options={[
                { value: '2', label: '2 Columns' },
                { value: '3', label: '3 Columns' },
                { value: '4', label: '4 Columns' },
                { value: '5', label: '5 Columns' },
                { value: '6', label: '6 Columns' },
              ]}
              noMargin
            />
          </div>
          <div>
            <Select
              label="Products Per Page"
              value={String(data?.products?.productsPerPage || 12)}
              onChange={(val) => setNestedData('products.productsPerPage', parseInt(val))}
              options={[
                { value: '8', label: '8' },
                { value: '12', label: '12' },
                { value: '16', label: '16' },
                { value: '24', label: '24' },
              ]}
              noMargin
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Settings size={14} />
          Features
        </label>
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
          <ToggleControl label={t('editor.controls.common.showSearch')} checked={data?.products?.showSearch !== false} onChange={(v) => setNestedData('products.showSearch', v)} />
          <ToggleControl label={t('editor.controls.common.showFilters')} checked={data?.products?.showFilters !== false} onChange={(v) => setNestedData('products.showFilters', v)} />
          <ToggleControl label={t('editor.controls.common.showPagination')} checked={data?.products?.showPagination !== false} onChange={(v) => setNestedData('products.showPagination', v)} />
          <ToggleControl label={t('editor.controls.common.showAddToCart')} checked={data?.products?.showAddToCart !== false} onChange={(v) => setNestedData('products.showAddToCart', v)} />
          <ToggleControl label={t('editor.controls.common.showQuickView')} checked={data?.products?.showQuickView === true} onChange={(v) => setNestedData('products.showQuickView', v)} />
          <ToggleControl label={t('editor.controls.common.showWishlist')} checked={data?.products?.showWishlist === true} onChange={(v) => setNestedData('products.showWishlist', v)} />
        </div>
      </div>

      {/* Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.products?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('products.colors.background', v)} />
        <ColorControl label="Heading" value={data?.products?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('products.colors.heading', v)} />
        <ColorControl label="Text" value={data?.products?.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('products.colors.text', v)} />
        <ColorControl label="Accent" value={data?.products?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('products.colors.accent', v)} />
        <ColorControl label="Card Background" value={data?.products?.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('products.colors.cardBackground', v)} />
        <ColorControl label="Card Text" value={data?.products?.colors?.cardText || '#F9FAFB'} onChange={(v) => setNestedData('products.colors.cardText', v)} />
        <ColorControl label="Button Background" value={data?.products?.colors?.buttonBackground || '#4f46e5'} onChange={(v) => setNestedData('products.colors.buttonBackground', v)} />
        <ColorControl label={t('editor.controls.common.buttonText')} value={data?.products?.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('products.colors.buttonText', v)} />
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
