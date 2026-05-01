/**
 * SlideshowControls.tsx
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
import { Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector , I18nInput, I18nTextArea } from '../../ui/EditorControlPrimitives';
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


export const renderSlideshowControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.slideshow) return null;
  return (
    <div className="space-y-4">
      <I18nInput label={t('editor.controls.common.title')} value={data.slideshow.title} onChange={(val) => setNestedData('slideshow.title', val)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.slideshow.titleFontSize || 'md'} onChange={(v) => setNestedData('slideshow.titleFontSize', v)} />


      <Select
        label={t('editor.controls.common.styleVariant')}
        value={data.slideshow.slideshowVariant || 'classic'}
        onChange={(v) => setNestedData('slideshow.slideshowVariant', v)}
        options={[
          { value: 'classic', label: 'Classic Slide' },
          { value: 'kenburns', label: 'Ken Burns Effect' },
          { value: 'cards3d', label: '3D Cards Stack' },
          { value: 'thumbnails', label: 'Thumbnail Gallery' }
        ]}
      />

      <BorderRadiusSelector
        label={t('editor.controls.common.borderRadius')}
        value={data.slideshow.borderRadius || 'xl'}
        onChange={(v) => setNestedData('slideshow.borderRadius', v)}
      />

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.animation')}</label>

      <div>
        <Select
          label={t('controls.transitionEffect')}
          value={data.slideshow.transitionEffect || 'slide'}
          onChange={(val) => setNestedData('slideshow.transitionEffect', val)}
          options={[
            { value: 'slide', label: 'Slide' },
            { value: 'fade', label: 'Fade' },
            { value: 'zoom', label: 'Zoom' },
          ]}
          noMargin
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.transitionDurationMs')}</label>
        <input
          type="number"
          min="200"
          max="2000"
          step="100"
          value={data.slideshow.transitionDuration || 500}
          onChange={(e) => setNestedData('slideshow.transitionDuration', parseInt(e.target.value))}
          className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text-primary focus:outline-none focus:ring-1 focus:ring-q-accent"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.autoplaySpeedMs')}</label>
        <input
          type="number"
          min="1000"
          max="10000"
          step="500"
          value={data.slideshow.autoPlaySpeed || 5000}
          onChange={(e) => setNestedData('slideshow.autoPlaySpeed', parseInt(e.target.value))}
          className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text-primary focus:outline-none focus:ring-1 focus:ring-q-accent"
        />
      </div>

      {(data.slideshow.slideshowVariant === 'kenburns') && (
        <div>
          <Select
            label={t('controls.kenBurnsIntensity')}
            value={data.slideshow.kenBurnsIntensity || 'medium'}
            onChange={(val) => setNestedData('slideshow.kenBurnsIntensity', val)}
            options={[
              { value: 'low', label: 'Low (5% zoom)' },
              { value: 'medium', label: 'Medium (10% zoom)' },
              { value: 'high', label: 'High (25% zoom)' },
            ]}
            noMargin
          />
        </div>
      )}

      {(data.slideshow.slideshowVariant === 'thumbnails') && (
        <div>
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.thumbnailHeightPx')}</label>
          <input
            type="number"
            min="60"
            max="150"
            step="10"
            value={data.slideshow.thumbnailSize || 80}
            onChange={(e) => setNestedData('slideshow.thumbnailSize', parseInt(e.target.value))}
            className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text-primary focus:outline-none focus:ring-1 focus:ring-q-accent"
          />
        </div>
      )}

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.navigation')}</label>

      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <ToggleControl label={t('editor.controls.common.showArrows')} checked={data.slideshow.showArrows ?? true} onChange={(v) => setNestedData('slideshow.showArrows', v)} />
        <ToggleControl label={t('editor.controls.common.showDots')} checked={data.slideshow.showDots ?? true} onChange={(v) => setNestedData('slideshow.showDots', v)} />
        <ToggleControl label={t('editor.controls.common.showCaptions')} checked={data.slideshow.showCaptions ?? false} onChange={(v) => setNestedData('slideshow.showCaptions', v)} />
      </div>

      {(data.slideshow.showArrows ?? true) && (
          <Select
            label={t('controls.arrowStyle')}
            value={data.slideshow.arrowStyle || 'rounded'}
            onChange={(val) => setNestedData('slideshow.arrowStyle', val)}
            options={[
              { value: 'rounded', label: 'Rounded' },
              { value: 'square', label: 'Square' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'floating', label: 'Floating' },
            ]}
            noMargin
          />
      )}

      {(data.slideshow.showDots ?? true) && (
          <Select
            label={t('controls.dotStyle')}
            value={data.slideshow.dotStyle || 'circle'}
            onChange={(val) => setNestedData('slideshow.dotStyle', val)}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'line', label: 'Line' },
              { value: 'square', label: 'Square' },
              { value: 'pill', label: 'Pill' },
            ]}
            noMargin
          />
      )}

      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data.slideshow.paddingY || 'md'} onChange={(v) => setNestedData('slideshow.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data.slideshow.paddingX || 'md'} onChange={(v) => setNestedData('slideshow.paddingX', v)} />
        </div>
      </div>

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.colors')}</label>
      <ColorControl label={t('editor.controls.common.background')} value={data.slideshow.colors?.background} onChange={(v) => setNestedData('slideshow.colors.background', v)} />
      <ColorControl label={t('editor.controls.common.title')} value={data.slideshow.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.heading', v)} />

      {(data.slideshow.showArrows ?? true) && (
        <>
          <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mt-3">Arrows</h5>
          <ColorControl label={t('controls.arrowBackground')} value={data.slideshow.colors?.arrowBackground || 'rgba(0, 0, 0, 0.5)'} onChange={(v) => setNestedData('slideshow.colors.arrowBackground', v)} />
          <ColorControl label={t('controls.arrowIcon')} value={data.slideshow.colors?.arrowText || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.arrowText', v)} />
        </>
      )}

      {(data.slideshow.showDots ?? true) && (
        <>
          <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mt-3">Dots</h5>
          <ColorControl label={t('controls.activeDot')} value={data.slideshow.colors?.dotActive || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.dotActive', v)} />
          <ColorControl label={t('controls.inactiveDot')} value={data.slideshow.colors?.dotInactive || 'rgba(255, 255, 255, 0.5)'} onChange={(v) => setNestedData('slideshow.colors.dotInactive', v)} />
        </>
      )}

      {(data.slideshow.showCaptions ?? false) && (
        <>
          <h5 className="text-xs font-bold text-q-text-secondary uppercase tracking-wider mt-3">Captions</h5>
          <ColorControl label={t('controls.captionBackground')} value={data.slideshow.colors?.captionBackground || 'rgba(0, 0, 0, 0.7)'} onChange={(v) => setNestedData('slideshow.colors.captionBackground', v)} />
          <ColorControl label={t('controls.captionText')} value={data.slideshow.colors?.captionText || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.captionText', v)} />
        </>
      )}


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data.slideshow.cornerGradient?.enabled || false}
        position={data.slideshow.cornerGradient?.position || 'top-left'}
        color={data.slideshow.cornerGradient?.color || '#4f46e5'}
        opacity={data.slideshow.cornerGradient?.opacity || 30}
        size={data.slideshow.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('slideshow.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('slideshow.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('slideshow.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('slideshow.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('slideshow.cornerGradient.size', v)}
      />

      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.slides')}</label>
      {(data.slideshow.items || []).map((item: any, index: number) => (
        <div key={index} className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 group">
          <ImagePicker
            label={`Slide #${index + 1}`}
            value={item.imageUrl}
            onChange={(url) => setNestedData(`slideshow.items.${index}.imageUrl`, url)}
            onRemove={() => {
              const newItems = (data.slideshow.items || []).filter((_: any, i: number) => i !== index);
              setNestedData('slideshow.items', newItems);
            }}
          />
          <I18nInput
            placeholder="Alt Text"
            value={item.altText}
            onChange={(val) => setNestedData(`slideshow.items.${index}.altText`, val)}
            className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mt-2"
          />
          {(data.slideshow.showCaptions ?? false) && (
            <I18nInput
              placeholder="Caption (optional)"
              value={item.caption || ''}
              onChange={(val) => setNestedData(`slideshow.items.${index}.caption`, val)}
              className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mt-2"
            />
          )}
        </div>
      ))}
      <button type="button"         onClick={() => {
          const newItems = [...(data.slideshow.items || []), { imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800', altText: 'New slide', caption: '' }];
          setNestedData('slideshow.items', newItems);
        }}
        className="w-full py-2 bg-q-accent text-q-bg rounded-md hover:bg-q-accent/90 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Plus size={16} /> Add Slide
      </button>
    </div>
  )
}

// ─── ─── ─── ─── ─── ─── ───

export const renderSlideshowControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.slideshow) return null;

  const contentTab = (
    <div className="space-y-4">
      <I18nInput label={t('editor.controls.common.title')} value={data.slideshow.title} onChange={(val) => setNestedData('slideshow.title', val)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.slideshow.titleFontSize || 'md'} onChange={(v) => setNestedData('slideshow.titleFontSize', v)} />


      <div>
        <Select
          label={t('controls.styleVariant')}
          value={data.slideshow.slideshowVariant || 'classic'}
          onChange={(val) => setNestedData('slideshow.slideshowVariant', val)}
          options={[
            { value: 'classic', label: 'Classic Slide' },
            { value: 'kenburns', label: 'Ken Burns Effect' },
            { value: 'cards3d', label: '3D Cards Stack' },
            { value: 'thumbnails', label: 'Thumbnail Gallery' },
          ]}
          noMargin
        />
      </div>


      {/* Slides */}
      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.slides')}</label>
      {(data.slideshow.items || []).map((item: any, index: number) => (
        <div key={index} className="bg-q-bg p-3 rounded-lg border border-q-border mb-3 group">
          <ImagePicker
            label={`Slide #${index + 1}`}
            value={item.imageUrl}
            onChange={(url) => setNestedData(`slideshow.items.${index}.imageUrl`, url)}
            onRemove={() => {
              const newItems = (data.slideshow.items || []).filter((_: any, i: number) => i !== index);
              setNestedData('slideshow.items', newItems);
            }}
          />
          <I18nInput
            placeholder="Alt Text"
            value={item.altText}
            onChange={(val) => setNestedData(`slideshow.items.${index}.altText`, val)}
            className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mt-2"
          />
          {(data.slideshow.showCaptions ?? false) && (
            <I18nInput
              placeholder="Caption (optional)"
              value={item.caption || ''}
              onChange={(val) => setNestedData(`slideshow.items.${index}.caption`, val)}
              className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent mt-2"
            />
          )}
        </div>
      ))}
      <button type="button"         onClick={() => {
          const newItems = [...(data.slideshow.items || []), { imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800', altText: 'New slide', caption: '' }];
          setNestedData('slideshow.items', newItems);
        }}
        className="w-full py-2 bg-q-accent text-q-bg rounded-md hover:bg-q-accent/90 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Plus size={16} /> Add Slide
      </button>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="slideshow" data={data} setNestedData={setNestedData} />
      {/* Border Radius */}
      <BorderRadiusSelector
        label={t('editor.controls.common.borderRadius')}
        value={data.slideshow.borderRadius || 'xl'}
        onChange={(v) => setNestedData('slideshow.borderRadius', v)}
      />


      {/* Animation Settings */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.animation')}</label>

        <div>
          <Select
            label={t('controls.transitionEffect')}
            value={data.slideshow.transitionEffect || 'slide'}
            onChange={(val) => setNestedData('slideshow.transitionEffect', val)}
            options={[
              { value: 'slide', label: 'Slide' },
              { value: 'fade', label: 'Fade' },
              { value: 'zoom', label: 'Zoom' },
            ]}
            noMargin
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.transitionDurationMs')}</label>
          <input
            type="number"
            min="200"
            max="2000"
            step="100"
            value={data.slideshow.transitionDuration || 500}
            onChange={(e) => setNestedData('slideshow.transitionDuration', parseInt(e.target.value))}
            className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text-primary focus:outline-none focus:ring-1 focus:ring-q-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.autoplaySpeedMs')}</label>
          <input
            type="number"
            min="1000"
            max="10000"
            step="500"
            value={data.slideshow.autoPlaySpeed || 5000}
            onChange={(e) => setNestedData('slideshow.autoPlaySpeed', parseInt(e.target.value))}
            className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text-primary focus:outline-none focus:ring-1 focus:ring-q-accent"
          />
        </div>

        {(data.slideshow.slideshowVariant === 'kenburns') && (
          <div>
            <Select
              label={t('controls.kenBurnsIntensity')}
              value={data.slideshow.kenBurnsIntensity || 'medium'}
              onChange={(val) => setNestedData('slideshow.kenBurnsIntensity', val)}
              options={[
                { value: 'low', label: 'Low (5% zoom)' },
                { value: 'medium', label: 'Medium (10% zoom)' },
                { value: 'high', label: 'High (25% zoom)' },
              ]}
              noMargin
            />
          </div>
        )}

        {(data.slideshow.slideshowVariant === 'thumbnails') && (
          <div>
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">{t('controls.thumbnailHeightPx')}</label>
            <input
              type="number"
              min="60"
              max="150"
              step="10"
              value={data.slideshow.thumbnailSize || 80}
              onChange={(e) => setNestedData('slideshow.thumbnailSize', parseInt(e.target.value))}
              className="w-full bg-q-surface border border-q-border rounded-md px-3 py-2 text-sm text-q-text-primary focus:outline-none focus:ring-1 focus:ring-q-accent"
            />
          </div>
        )}
      </div>


      {/* Navigation */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.navigation')}</label>
        <ToggleControl label={t('editor.controls.common.showArrows')} checked={data.slideshow.showArrows ?? true} onChange={(v) => setNestedData('slideshow.showArrows', v)} />
        <ToggleControl label={t('editor.controls.common.showDots')} checked={data.slideshow.showDots ?? true} onChange={(v) => setNestedData('slideshow.showDots', v)} />
        <ToggleControl label={t('editor.controls.common.showCaptions')} checked={data.slideshow.showCaptions ?? false} onChange={(v) => setNestedData('slideshow.showCaptions', v)} />
      </div>

      {(data.slideshow.showArrows ?? true) && (
        <div>
          <Select
            label={t('controls.arrowStyle')}
            value={data.slideshow.arrowStyle || 'rounded'}
            onChange={(val) => setNestedData('slideshow.arrowStyle', val)}
            options={[
              { value: 'rounded', label: 'Rounded' },
              { value: 'square', label: 'Square' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'floating', label: 'Floating' },
            ]}
            noMargin
          />
        </div>
      )}

      {(data.slideshow.showDots ?? true) && (
        <div>
          <Select
            label={t('controls.dotStyle')}
            value={data.slideshow.dotStyle || 'circle'}
            onChange={(val) => setNestedData('slideshow.dotStyle', val)}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'line', label: 'Line' },
              { value: 'square', label: 'Square' },
              { value: 'pill', label: 'Pill' },
            ]}
            noMargin
          />
        </div>
      )}


      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="grid grid-cols-2 gap-3">
          <PaddingSelector label={t('controls.vertical')} value={data.slideshow.paddingY || 'md'} onChange={(v) => setNestedData('slideshow.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data.slideshow.paddingX || 'md'} onChange={(v) => setNestedData('slideshow.paddingX', v)} />
        </div>
      </div>


      {/* Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.colors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data.slideshow.colors?.background} onChange={(v) => setNestedData('slideshow.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.slideshow.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.heading', v)} />
      </div>

      {(data.slideshow.showArrows ?? true) && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
          <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.arrowColors')}</label>
          <ColorControl label={t('controls.arrowBackground')} value={data.slideshow.colors?.arrowBackground || 'rgba(0, 0, 0, 0.5)'} onChange={(v) => setNestedData('slideshow.colors.arrowBackground', v)} />
          <ColorControl label={t('controls.arrowIcon')} value={data.slideshow.colors?.arrowText || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.arrowText', v)} />
        </div>
      )}

      {(data.slideshow.showDots ?? true) && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
          <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.dotColors')}</label>
          <ColorControl label={t('controls.activeDot')} value={data.slideshow.colors?.dotActive || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.dotActive', v)} />
          <ColorControl label={t('controls.inactiveDot')} value={data.slideshow.colors?.dotInactive || 'rgba(255, 255, 255, 0.5)'} onChange={(v) => setNestedData('slideshow.colors.dotInactive', v)} />
        </div>
      )}

      {(data.slideshow.showCaptions ?? false) && (
        <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
          <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.captionColors')}</label>
          <ColorControl label={t('controls.captionBackground')} value={data.slideshow.colors?.captionBackground || 'rgba(0, 0, 0, 0.7)'} onChange={(v) => setNestedData('slideshow.colors.captionBackground', v)} />
          <ColorControl label={t('controls.captionText')} value={data.slideshow.colors?.captionText || '#ffffff'} onChange={(v) => setNestedData('slideshow.colors.captionText', v)} />
        </div>
      )}


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data.slideshow.cornerGradient?.enabled || false}
        position={data.slideshow.cornerGradient?.position || 'top-left'}
        color={data.slideshow.cornerGradient?.color || '#4f46e5'}
        opacity={data.slideshow.cornerGradient?.opacity || 30}
        size={data.slideshow.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('slideshow.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('slideshow.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('slideshow.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('slideshow.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('slideshow.cornerGradient.size', v)}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
