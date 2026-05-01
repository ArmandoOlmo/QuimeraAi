/**
 * TeamControls.tsx
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
import {
  Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector
} from '../../ui/EditorControlPrimitives';
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


export const renderTeamControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.team) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* Team Variant Selector */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.teamStyle')}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'classic', label: 'Classic' },
            { value: 'cards', label: 'Cards' },
            { value: 'minimal', label: 'Minimal' },
            { value: 'overlay', label: 'Overlay' }
          ].map((variant) => (
            <button type="button"               key={variant.value}
              onClick={() => setNestedData('team.teamVariant', variant.value)}
              className={`p-2 text-xs font-medium rounded-md border transition-all ${(data?.team?.teamVariant || 'classic') === variant.value
                ? 'bg-q-accent text-q-bg border-q-accent'
                : 'bg-q-surface text-q-text-secondary border-q-border hover:border-q-accent'
                }`}
            >
              {variant.label}
            </button>
          ))}
        </div>
      </div>


      {/* Content */}
      <Input label={t('editor.controls.common.title')} value={data?.team?.title} onChange={(val) => setNestedData('team.title', val)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.team?.titleFontSize || 'md'} onChange={(v) => setNestedData('team.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data?.team?.description} onChange={(val) => setNestedData('team.description', val)} rows={2} />
      <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.team?.descriptionFontSize || 'md'} onChange={(v) => setNestedData('team.descriptionFontSize', v)} />


      {/* Team Members */}
      <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider mb-2">{t('controls.teamMembers')}</label>
      {(data?.team?.items || []).map((member: any, index: number) => (
        <div key={index} className="bg-q-bg p-3 rounded-lg border border-q-border mb-3">
          <ImagePicker
            label={`${t('editor.controls.team.member')} #${index + 1}`}
            value={member.imageUrl}
            onChange={(url) => setNestedData(`team.items.${index}.imageUrl`, url)}
            onRemove={() => {
              const newItems = [...(data?.team?.items || [])];
              newItems.splice(index, 1);
              setNestedData('team.items', newItems);
            }}
          />
          <Input label={t('controls.name')} value={member.name} onChange={(val) => setNestedData(`team.items.${index}.name`, val)} className="mt-2" />
          <Input label={t('controls.role')} value={member.role} onChange={(val) => setNestedData(`team.items.${index}.role`, val)} />
          <Input label={t('controls.bioOverlay')} value={member.bio || ''} onChange={(val) => setNestedData(`team.items.${index}.bio`, val)} placeholder="Short bio shown on hover" />

          {/* Link Controls */}
          <div className="mt-3 pt-3 border-t border-q-border/50">
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider flex items-center gap-1">
              <Link size={12} />
              Perfil / Enlace
            </label>
            <div className="flex bg-q-surface rounded-md border border-q-border p-1 mb-2">
              {[
                { value: 'manual', label: 'URL' },
                { value: 'content', label: 'Contenido' }
              ].map((type) => (
                <button type="button"                   key={type.value}
                  onClick={() => setNestedData(`team.items.${index}.linkType`, type.value)}
                  className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${(member.linkType || 'manual') === type.value
                    ? 'bg-q-accent text-q-bg'
                    : 'text-q-text-secondary hover:text-q-text-primary hover:bg-q-bg'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {(member.linkType === 'manual' || !member.linkType) && (
              <Input
                placeholder="https://... o /pagina"
                value={member.linkUrl || ''}
                onChange={(val) => setNestedData(`team.items.${index}.linkUrl`, val)}
                className="w-full bg-q-surface border border-q-border rounded px-2 py-1 text-xs text-q-text-primary focus:outline-none focus:border-q-accent"
              />
            )}
            {member.linkType === 'content' && (
              <SingleContentSelector
                selectedContentPath={member.linkUrl}
                onSelect={(path) => {
                  setNestedData(`team.items.${index}.linkUrl`, path || '');
                }}
                label={t('editor.controls.common.selectContent')}
              />
            )}
          </div>
        </div>
      ))}
      <button type="button"         onClick={() => {
          const newItems = [...(data?.team?.items || []), { name: 'New Member', role: 'Role', imageUrl: '' }];
          setNestedData('team.items', newItems);
        }}
        className="w-full py-2 border border-dashed border-q-border rounded-lg text-q-text-secondary hover:text-q-accent hover:border-q-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus size={14} /> Add Member
      </button>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="team" data={data} setNestedData={setNestedData} />
      {/* Section Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.sectionColors')}</label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.team?.colors?.background || '#0f172a'} onChange={(v) => setNestedData('team.colors.background', v)} />
        <ColorControl label={t('controls.sectionTitle')} value={data?.team?.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('team.colors.heading', v)} />
        <ColorControl label={t('controls.sectionDescription')} value={data?.team?.colors?.description || '#94a3b8'} onChange={(v) => setNestedData('team.colors.description', v)} />
        <ColorControl label={t('controls.accent')} value={data?.team?.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('team.colors.accent', v)} />
      </div>


      {/* Card Colors */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.cardColors')}</label>
        <ColorControl label={t('controls.cardBackground')} value={data?.team?.colors?.cardBackground || 'rgba(30, 41, 59, 0.5)'} onChange={(v) => setNestedData('team.colors.cardBackground', v)} />
        <ColorControl label={t('controls.cardName')} value={data?.team?.colors?.cardHeading || '#ffffff'} onChange={(v) => setNestedData('team.colors.cardHeading', v)} />
        <ColorControl label={t('controls.cardRole')} value={data?.team?.colors?.cardText || '#94a3b8'} onChange={(v) => setNestedData('team.colors.cardText', v)} />
        <ColorControl label={t('controls.photoBorder')} value={data?.team?.colors?.photoBorderColor || '#4f46e5'} onChange={(v) => setNestedData('team.colors.photoBorderColor', v)} />
      </div>


      {/* Spacing */}
      <div className="bg-q-surface/50 p-4 rounded-lg border border-q-border space-y-2">
        <label className="block text-xs font-bold text-q-text-secondary uppercase tracking-wider">{t('controls.spacing')}</label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.vertical')} value={data?.team?.paddingY || 'md'} onChange={(v) => setNestedData('team.paddingY', v)} />
          <PaddingSelector label={t('controls.horizontal')} value={data?.team?.paddingX || 'md'} onChange={(v) => setNestedData('team.paddingX', v)} />
        </div>
      </div>


      {/* Corner Gradient */}
      <CornerGradientControl
        enabled={data?.team?.cornerGradient?.enabled || false}
        position={data?.team?.cornerGradient?.position || 'top-left'}
        color={data?.team?.cornerGradient?.color || '#4f46e5'}
        opacity={data?.team?.cornerGradient?.opacity || 30}
        size={data?.team?.cornerGradient?.size || 50}
        onEnabledChange={(v) => setNestedData('team.cornerGradient.enabled', v)}
        onPositionChange={(v) => setNestedData('team.cornerGradient.position', v)}
        onColorChange={(v) => setNestedData('team.cornerGradient.color', v)}
        onOpacityChange={(v) => setNestedData('team.cornerGradient.opacity', v)}
        onSizeChange={(v) => setNestedData('team.cornerGradient.size', v)}
      />


      {/* Animation Controls */}
      <AnimationControls
        animationType={data?.team?.animationType || 'fade-in-up'}
        enableCardAnimation={data?.team?.enableCardAnimation !== false}
        onChangeAnimationType={(type) => setNestedData('team.animationType', type)}
        onToggleAnimation={(enabled) => setNestedData('team.enableCardAnimation', enabled)}
        label={t('editor.controls.common.cardAnimations')}
      />
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
