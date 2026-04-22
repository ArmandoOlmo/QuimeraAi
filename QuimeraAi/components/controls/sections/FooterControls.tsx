/**
 * FooterControls.tsx
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
import { BackgroundImageControl, CornerGradientControl, extractVideoId, ControlsDeps, CardGlowControl } from '../ControlsShared';
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


export const renderFooterControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.footer) return null;

  return (
    <div className="space-y-4">
      {/* Logo Type Selector */}
      <div>
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Logo Type</label>
        <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
          {['text', 'image'].map(type => (
            <button
              key={type}
              onClick={() => setNestedData('footer.logoType', type)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.footer.logoType || 'text') === type
                ? 'bg-editor-accent text-editor-bg'
                : 'text-editor-text-secondary hover:bg-editor-border'
                }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Logo Image Upload - only shown when logoType is 'image' */}
      {data.footer.logoType === 'image' && (
        <ImagePicker
          label={t('editor.controls.common.logoImage')}
          value={data.footer.logoImageUrl || ''}
          onChange={(url) => setNestedData('footer.logoImageUrl', url)}
        />
      )}

      <Input label={t('editor.controls.common.title')} value={data.footer.title} onChange={(e) => setNestedData('footer.title', e.target.value)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.footer.titleFontSize || 'sm'} onChange={(v) => setNestedData('footer.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data.footer.description} onChange={(e) => setNestedData('footer.description', e.target.value)} rows={2} />
      <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.footer.descriptionFontSize || 'sm'} onChange={(v) => setNestedData('footer.descriptionFontSize', v)} />

      <Input label={t('editor.controls.common.copyright')} value={data.footer.copyrightText} onChange={(e) => setNestedData('footer.copyrightText', e.target.value)} />
      <div className="space-y-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2">Link Columns</label>
        {(data.footer.linkColumns || []).map((col, colIndex) => (
          <div key={colIndex} className="bg-editor-bg p-3 rounded border border-editor-border space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <input placeholder="Column Title" value={col.title} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.title`, e.target.value)} className="bg-transparent border-b border-editor-border focus:border-editor-accent flex-1 text-sm font-bold text-editor-text-primary px-1 min-w-0 focus:outline-none" />
              <button onClick={() => {
                const newCols = (data.footer.linkColumns || []).filter((_, i) => i !== colIndex);
                setNestedData('footer.linkColumns', newCols);
              }} className="text-red-400 hover:text-red-500 flex-shrink-0 hover:bg-red-500/10 rounded p-1 transition-colors"><Trash2 size={14} /></button>
            </div>

            {/* Menu Selector per Column */}
            <Select
              value={col.menuId || ''}
              onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.menuId`, val === '' ? undefined : val)}
              options={[
                { value: '', label: 'Manual Links' },
                ...menus.map(menu => ({ value: menu.id, label: menu.title })),
              ]}
              noMargin
            />

            {/* Conditional Link List */}
            {col.menuId ? (
              <p className="text-[10px] text-editor-text-secondary italic">Using links from menu: {menus.find(m => m.id === col.menuId)?.title}</p>
            ) : (
              <>
                {(col.links || []).map((link, linkIndex) => (
                  <div key={linkIndex} className="flex gap-2 items-center mb-1">
                    <input placeholder="Text" value={link.text} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.text`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                    <input placeholder="Href" value={link.href} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.href`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                    <button onClick={() => {
                      const newLinks = (col.links || []).filter((_, i) => i !== linkIndex);
                      setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                    }} className="text-editor-text-secondary hover:text-red-400 flex-shrink-0"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button onClick={() => {
                  const newLinks = [...(col.links || []), { text: 'New Link', href: '/' }];
                  setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                }} className="text-xs text-editor-accent hover:underline mt-1">+ Add Link</button>
              </>
            )}
          </div>
        ))}
        <button onClick={() => setNestedData('footer.linkColumns', [...(data.footer.linkColumns || []), { title: 'New Column', links: [] }])} className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={14} /> Add Column</button>
      </div>
      <SocialLinksEditor
        socialLinks={data.footer.socialLinks}
        onUpdate={(newLinks) => setNestedData('footer.socialLinks', newLinks)}
        onUpdateHref={(index, href) => setNestedData(`footer.socialLinks.${index}.href`, href)}
      />


      {/* Contact Information */}
      <div className="space-y-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <MapPin size={14} className="text-editor-accent" />
          Contact Information
        </label>
        <Input
          label={t('editor.controls.common.address')}
          value={data.footer.contactInfo?.address || ''}
          onChange={(e) => setNestedData('footer.contactInfo.address', e.target.value)}
          placeholder="123 Main Street"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label={t('editor.controls.common.city')}
            value={data.footer.contactInfo?.city || ''}
            onChange={(e) => setNestedData('footer.contactInfo.city', e.target.value)}
            placeholder="City"
          />
          <Input
            label={t('editor.controls.common.state')}
            value={data.footer.contactInfo?.state || ''}
            onChange={(e) => setNestedData('footer.contactInfo.state', e.target.value)}
            placeholder="State"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            label={t('editor.controls.common.zipCode')}
            value={data.footer.contactInfo?.zipCode || ''}
            onChange={(e) => setNestedData('footer.contactInfo.zipCode', e.target.value)}
            placeholder="12345"
          />
          <Input
            label={t('editor.controls.common.country')}
            value={data.footer.contactInfo?.country || ''}
            onChange={(e) => setNestedData('footer.contactInfo.country', e.target.value)}
            placeholder="Country"
          />
        </div>
        <Input
          label={t('editor.controls.common.phone')}
          value={data.footer.contactInfo?.phone || ''}
          onChange={(e) => setNestedData('footer.contactInfo.phone', e.target.value)}
          placeholder="+1 (555) 123-4567"
        />
        <Input
          label={t('editor.controls.common.email')}
          value={data.footer.contactInfo?.email || ''}
          onChange={(e) => setNestedData('footer.contactInfo.email', e.target.value)}
          placeholder="contact@example.com"
        />
      </div>


      {/* Business Hours */}
      <div className="space-y-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <Clock size={14} className="text-editor-accent" />
          Business Hours
        </label>

        {/* Quick copy buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              const businessHours = data.footer.contactInfo?.businessHours || {};
              const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
              const newHours: any = {};
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                newHours[day] = { ...monHours };
              });
              setNestedData('footer.contactInfo.businessHours', { ...businessHours, ...newHours });
            }}
            className="text-xs px-2 py-1 bg-editor-accent/20 text-editor-accent rounded hover:bg-editor-accent/30 transition-colors"
          >
            Copy Mon → Weekdays
          </button>
          <button
            onClick={() => {
              const businessHours = data.footer.contactInfo?.businessHours || {};
              const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
              const newHours: any = {};
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                newHours[day] = { ...monHours };
              });
              setNestedData('footer.contactInfo.businessHours', newHours);
            }}
            className="text-xs px-2 py-1 bg-editor-accent/20 text-editor-accent rounded hover:bg-editor-accent/30 transition-colors"
          >
            Copy Mon → All Days
          </button>
        </div>

        {/* Days */}
        <div className="space-y-2 bg-editor-bg p-3 rounded-lg border border-editor-border">
          {[
            { key: 'monday', label: 'Mon' },
            { key: 'tuesday', label: 'Tue' },
            { key: 'wednesday', label: 'Wed' },
            { key: 'thursday', label: 'Thu' },
            { key: 'friday', label: 'Fri' },
            { key: 'saturday', label: 'Sat' },
            { key: 'sunday', label: 'Sun' },
          ].map(({ key, label }) => {
            // Safer access to potentially undefined nested objects
            const contactInfo = data.footer.contactInfo || {};
            const businessHours = contactInfo.businessHours || {};
            const dayHours = businessHours[key as keyof typeof businessHours] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };

            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-10 text-xs font-medium text-editor-text-secondary">{label}</span>
                <button
                  onClick={() => {
                    // When toggling, we need to handle the case where contactInfo or businessHours don't exist yet
                    if (!dayHours.isOpen) {
                      // Turning ON: Set the full object to ensure structure exists
                      setNestedData(`footer.contactInfo.businessHours.${key}`, {
                        isOpen: true,
                        openTime: dayHours.openTime || '09:00',
                        closeTime: dayHours.closeTime || '17:00'
                      });
                    } else {
                      // Turning OFF: Just update the flag
                      setNestedData(`footer.contactInfo.businessHours.${key}.isOpen`, false);
                    }
                  }}
                  className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${dayHours.isOpen ? 'bg-green-500' : 'bg-editor-border'
                    }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dayHours.isOpen ? 'left-5' : 'left-0.5'
                      }`}
                  />
                </button>
                {dayHours.isOpen ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="time"
                      value={dayHours.openTime || '09:00'}
                      onChange={(e) => setNestedData(`footer.contactInfo.businessHours.${key}.openTime`, e.target.value)}
                      className="w-[90px] bg-editor-panel-bg border border-editor-border rounded px-1.5 py-0.5 text-xs text-editor-text-primary"
                    />
                    <span className="text-editor-text-secondary text-xs">-</span>
                    <input
                      type="time"
                      value={dayHours.closeTime || '17:00'}
                      onChange={(e) => setNestedData(`footer.contactInfo.businessHours.${key}.closeTime`, e.target.value)}
                      className="w-[90px] bg-editor-panel-bg border border-editor-border rounded px-1.5 py-0.5 text-xs text-editor-text-primary"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-editor-text-secondary italic">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <ColorControl label={t('editor.controls.common.background')} value={data.footer.colors?.background} onChange={(v) => setNestedData('footer.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data.footer.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('footer.colors.heading', v)} />
        <ColorControl label="Text" value={data.footer.colors?.text} onChange={(v) => setNestedData('footer.colors.text', v)} />
      </div>
    </div>
  );
}

// Map section IDs to Icons and Renderers
// Helper to get section label
const getSectionLabel = (section: PageSection): string => {
  const labels: Record<PageSection, string> = {
    hero: 'Hero Section',
    heroSplit: 'Hero Split',
    features: 'Features',
    testimonials: 'Testimonials',
    services: 'Services',
    team: 'Team',
    pricing: 'Pricing',
    faq: 'FAQ',
    portfolio: 'Portfolio',
    leads: 'Lead Form',
    newsletter: 'Newsletter',
    cta: 'Call to Action',
    slideshow: 'Slideshow',
    video: 'Video',
    howItWorks: 'How It Works',
    map: 'Location Map',
    menu: 'Restaurant Menu',
    chatbot: 'AI Chatbot',
    footer: 'Footer',
    header: 'Navigation',
    typography: 'Typography',
    colors: 'Global Colors',
    banner: 'Banner',
    products: 'Products Grid',
    storeSettings: 'Store Settings',
    // Ecommerce sections
    featuredProducts: 'Featured Products',
    categoryGrid: 'Category Grid',
    productHero: 'Product Hero',
    saleCountdown: 'Sale Countdown',
    trustBadges: 'Trust Badges',
    recentlyViewed: 'Recently Viewed',
    productReviews: 'Product Reviews',
    collectionBanner: 'Collection Banner',
    productBundle: 'Product Bundle',
    announcementBar: 'Announcement Bar',
  };
  return labels[section] || section;
};

// Function to geocode address - uses Google Maps client Geocoder or Nominatim fallback
const geocodeAddress = async () => {
  const address = data?.map?.address;
  if (!address || address.trim() === '') {
    setGeocodeError('Please enter an address first');
    return;
  }

  setIsGeocoding(true);
  setGeocodeError(null);

  try {
    // Method 1: Try using Google Maps client Geocoder if available
    if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();

      geocoder.geocode({ address }, (results, status) => {
        setIsGeocoding(false);

        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          setNestedData('map.lat', lat);
          setNestedData('map.lng', lng);
          setGeocodeError(null);
        } else if (status === 'ZERO_RESULTS') {
          setGeocodeError('Location not found. Try a more specific address.');
        } else {
          // Fallback to Nominatim if Google fails
          geocodeWithNominatim(address);
        }
      });
      return;
    }

    // Method 2: Fallback to Nominatim (OpenStreetMap) - free and no API key needed
    await geocodeWithNominatim(address);

  } catch (error) {
    console.error('Geocoding error:', error);
    setGeocodeError('Error searching location. Please try again.');
    setIsGeocoding(false);
  }
};

// Helper function for Nominatim geocoding (OpenStreetMap - free)
const geocodeWithNominatim = async (address: string) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'QuimeraAI/1.0'
        }
      }
    );
    const results = await response.json();

    if (results && results.length > 0) {
      const { lat, lon } = results[0];
      setNestedData('map.lat', parseFloat(lat));
      setNestedData('map.lng', parseFloat(lon));
      setGeocodeError(null);
    } else {
      setGeocodeError('Location not found. Try a more specific address.');
    }
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    setGeocodeError('Error searching location. Please try again.');
  } finally {
    setIsGeocoding(false);
  }
};

// ─── ─── ─── ─── ─── ─── ───

export const renderFooterControlsWithTabs = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.footer) return null;

  const contentTab = (
    <div className="space-y-4">
      {/* ========== LOGO ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Image size={14} />
          Logo
        </label>
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Logo Type</label>
        <div className="flex bg-editor-bg p-1 rounded-md border border-editor-border">
          {['text', 'image'].map(type => (
            <button
              key={type}
              onClick={() => setNestedData('footer.logoType', type)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors ${(data.footer.logoType || 'text') === type
                ? 'bg-editor-accent text-editor-bg'
                : 'text-editor-text-secondary hover:bg-editor-border'
                }`}
            >
              {type}
            </button>
          ))}
        </div>

        {data.footer.logoType === 'image' && (
          <div className="mt-3">
            <ImagePicker
              label={t('editor.controls.common.logoImage')}
              value={data.footer.logoImageUrl || ''}
              onChange={(url) => setNestedData('footer.logoImageUrl', url)}
            />
          </div>
        )}
      </div>


      {/* ========== CONTENT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          Contenido
        </label>
        <Input label={t('editor.controls.common.title')} value={data.footer.title} onChange={(e) => setNestedData('footer.title', e.target.value)} />
        <TextArea label={t('editor.controls.common.description')} value={data.footer.description} onChange={(e) => setNestedData('footer.description', e.target.value)} rows={2} />
        <Input label={t('editor.controls.common.copyright')} value={data.footer.copyrightText} onChange={(e) => setNestedData('footer.copyrightText', e.target.value)} />
      </div>


      {/* ========== LINK COLUMNS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Columns size={14} />
          Link Columns
        </label>
        <div className="space-y-4">
        {(data.footer.linkColumns || []).map((col, colIndex) => (
          <div key={colIndex} className="bg-editor-bg p-3 rounded border border-editor-border space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <input placeholder="Column Title" value={col.title} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.title`, e.target.value)} className="bg-transparent border-b border-editor-border focus:border-editor-accent flex-1 text-sm font-bold text-editor-text-primary px-1 min-w-0 focus:outline-none" />
              <button onClick={() => {
                const newCols = (data.footer.linkColumns || []).filter((_, i) => i !== colIndex);
                setNestedData('footer.linkColumns', newCols);
              }} className="text-red-400 hover:text-red-500 flex-shrink-0 hover:bg-red-500/10 rounded p-1 transition-colors"><Trash2 size={14} /></button>
            </div>

            <Select
              value={col.menuId || ''}
              onChange={(val) => setNestedData(`footer.linkColumns.${colIndex}.menuId`, val === '' ? undefined : val)}
              options={[
                { value: '', label: 'Manual Links' },
                ...menus.map(menu => ({ value: menu.id, label: menu.title })),
              ]}
              noMargin
            />

            {col.menuId ? (
              <p className="text-[10px] text-editor-text-secondary italic">Using links from menu: {menus.find(m => m.id === col.menuId)?.title}</p>
            ) : (
              <>
                {(col.links || []).map((link, linkIndex) => (
                  <div key={linkIndex} className="flex gap-2 items-center mb-1">
                    <input placeholder="Text" value={link.text} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.text`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                    <input placeholder="Href" value={link.href} onChange={(e) => setNestedData(`footer.linkColumns.${colIndex}.links.${linkIndex}.href`, e.target.value)} className="flex-1 bg-editor-panel-bg border border-editor-border rounded px-2 py-1 text-xs text-editor-text-primary min-w-0 focus:outline-none focus:ring-1 focus:ring-editor-accent" />
                    <button onClick={() => {
                      const newLinks = (col.links || []).filter((_, i) => i !== linkIndex);
                      setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                    }} className="text-editor-text-secondary hover:text-red-400 flex-shrink-0"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button onClick={() => {
                  const newLinks = [...(col.links || []), { text: 'New Link', href: '/' }];
                  setNestedData(`footer.linkColumns.${colIndex}.links`, newLinks);
                }} className="text-xs text-editor-accent hover:underline mt-1">+ Add Link</button>
              </>
            )}
          </div>
        ))}
          <button onClick={() => setNestedData('footer.linkColumns', [...(data.footer.linkColumns || []), { title: 'New Column', links: [] }])} className="w-full py-2 border border-dashed border-editor-border rounded-lg text-editor-text-secondary hover:text-editor-accent transition-all flex items-center justify-center gap-2 text-sm font-medium"><Plus size={14} /> Add Column</button>
        </div>
      </div>


      {/* ========== SOCIAL LINKS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Share2 size={14} />
          Redes Sociales
        </label>
        <SocialLinksEditor
          socialLinks={data.footer.socialLinks}
          onUpdate={(newLinks) => setNestedData('footer.socialLinks', newLinks)}
          onUpdateHref={(index, href) => setNestedData(`footer.socialLinks.${index}.href`, href)}
        />
      </div>


      {/* ========== CONTACT INFORMATION ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <MapPin size={14} />
          Contact Information
        </label>
        <div className="space-y-3">
          <Input label={t('editor.controls.common.address')} value={data.footer.contactInfo?.address || ''} onChange={(e) => setNestedData('footer.contactInfo.address', e.target.value)} placeholder="123 Main Street" />
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('editor.controls.common.city')} value={data.footer.contactInfo?.city || ''} onChange={(e) => setNestedData('footer.contactInfo.city', e.target.value)} placeholder="City" />
            <Input label={t('editor.controls.common.state')} value={data.footer.contactInfo?.state || ''} onChange={(e) => setNestedData('footer.contactInfo.state', e.target.value)} placeholder="State" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label={t('editor.controls.common.zipCode')} value={data.footer.contactInfo?.zipCode || ''} onChange={(e) => setNestedData('footer.contactInfo.zipCode', e.target.value)} placeholder="12345" />
            <Input label={t('editor.controls.common.country')} value={data.footer.contactInfo?.country || ''} onChange={(e) => setNestedData('footer.contactInfo.country', e.target.value)} placeholder="Country" />
          </div>
          <Input label={t('editor.controls.common.phone')} value={data.footer.contactInfo?.phone || ''} onChange={(e) => setNestedData('footer.contactInfo.phone', e.target.value)} placeholder="+1 (555) 123-4567" />
          <Input label={t('editor.controls.common.email')} value={data.footer.contactInfo?.email || ''} onChange={(e) => setNestedData('footer.contactInfo.email', e.target.value)} placeholder="contact@example.com" />
        </div>
      </div>


      {/* ========== BUSINESS HOURS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock size={14} />
          Business Hours
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              const businessHours = data.footer.contactInfo?.businessHours || {};
              const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
              const newHours: any = {};
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                newHours[day] = { ...monHours };
              });
              setNestedData('footer.contactInfo.businessHours', { ...businessHours, ...newHours });
            }}
            className="text-xs px-2 py-1 bg-editor-accent/20 text-editor-accent rounded hover:bg-editor-accent/30 transition-colors"
          >
            Copy Mon → Weekdays
          </button>
          <button
            onClick={() => {
              const businessHours = data.footer.contactInfo?.businessHours || {};
              const monHours = businessHours.monday || { isOpen: true, openTime: '09:00', closeTime: '17:00' };
              const newHours: any = {};
              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
                newHours[day] = { ...monHours };
              });
              setNestedData('footer.contactInfo.businessHours', newHours);
            }}
            className="text-xs px-2 py-1 bg-editor-accent/20 text-editor-accent rounded hover:bg-editor-accent/30 transition-colors"
          >
            Copy Mon → All Days
          </button>
        </div>

        <div className="space-y-2 bg-editor-bg p-3 rounded-lg border border-editor-border">
          {[
            { key: 'monday', label: 'Mon' },
            { key: 'tuesday', label: 'Tue' },
            { key: 'wednesday', label: 'Wed' },
            { key: 'thursday', label: 'Thu' },
            { key: 'friday', label: 'Fri' },
            { key: 'saturday', label: 'Sat' },
            { key: 'sunday', label: 'Sun' },
          ].map(({ key, label }) => {
            const contactInfo = data.footer.contactInfo || {};
            const businessHours = contactInfo.businessHours || {};
            const dayHours = businessHours[key as keyof typeof businessHours] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };

            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-10 text-xs font-medium text-editor-text-secondary">{label}</span>
                <button
                  onClick={() => {
                    if (!dayHours.isOpen) {
                      setNestedData(`footer.contactInfo.businessHours.${key}`, {
                        isOpen: true,
                        openTime: dayHours.openTime || '09:00',
                        closeTime: dayHours.closeTime || '17:00'
                      });
                    } else {
                      setNestedData(`footer.contactInfo.businessHours.${key}.isOpen`, false);
                    }
                  }}
                  className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${dayHours.isOpen ? 'bg-green-500' : 'bg-editor-border'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${dayHours.isOpen ? 'left-5' : 'left-0.5'}`} />
                </button>
                {dayHours.isOpen ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input type="time" value={dayHours.openTime || '09:00'} onChange={(e) => setNestedData(`footer.contactInfo.businessHours.${key}.openTime`, e.target.value)} className="w-[90px] bg-editor-panel-bg border border-editor-border rounded px-1.5 py-0.5 text-xs text-editor-text-primary" />
                    <span className="text-editor-text-secondary text-xs">-</span>
                    <input type="time" value={dayHours.closeTime || '17:00'} onChange={(e) => setNestedData(`footer.contactInfo.businessHours.${key}.closeTime`, e.target.value)} className="w-[90px] bg-editor-panel-bg border border-editor-border rounded px-1.5 py-0.5 text-xs text-editor-text-primary" />
                  </div>
                ) : (
                  <span className="text-xs text-editor-text-secondary italic">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== VARIANT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layout size={14} />
          Footer Variant
        </label>
        <Select
          value={data.footer.footerVariant || 'classic'}
          onChange={(val) => setNestedData('footer.footerVariant', val)}
          options={[
            { value: 'classic', label: 'Classic' },
            { value: 'neon-glow', label: 'Neon Glow' }
          ]}
          noMargin
        />
      </div>

      {/* ========== NEON GLOW ========== */}
      {data.footer.footerVariant === 'neon-glow' && (
        <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
          <CardGlowControl
            enabled={data.footer.cardGlow?.enabled !== false}
            color={data.footer.cardGlow?.color || '#144CCD'}
            intensity={data.footer.cardGlow?.intensity ?? 100}
            borderRadius={data.footer.cardGlow?.borderRadius ?? 0}
            gradientStart={data.footer.cardGlow?.gradientStart || '#0A0909'}
            gradientEnd={data.footer.cardGlow?.gradientEnd || '#09101F'}
            onEnabledChange={(v) => setNestedData('footer.cardGlow.enabled', v)}
            onColorChange={(v) => setNestedData('footer.cardGlow.color', v)}
            onIntensityChange={(v) => setNestedData('footer.cardGlow.intensity', v)}
            onBorderRadiusChange={(v) => setNestedData('footer.cardGlow.borderRadius', v)}
            onGradientStartChange={(v) => setNestedData('footer.cardGlow.gradientStart', v)}
            onGradientEndChange={(v) => setNestedData('footer.cardGlow.gradientEnd', v)}
          />
        </div>
      )}

      {/* ========== TYPOGRAPHY ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Type size={14} />
          Tipografía
        </label>
        <div className="space-y-3">
          <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data.footer.titleFontSize || 'sm'} onChange={(v) => setNestedData('footer.titleFontSize', v)} />
          <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data.footer.descriptionFontSize || 'sm'} onChange={(v) => setNestedData('footer.descriptionFontSize', v)} />
        </div>
      </div>


      {/* ========== COLORS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Palette size={14} />
          {t('editor.controls.common.colors')}
        </label>
        <div className="space-y-3">
          <ColorControl label={t('editor.controls.common.background')} value={data.footer.colors?.background} onChange={(v) => setNestedData('footer.colors.background', v)} />
          <ColorControl label={t('editor.controls.common.title')} value={data.footer.colors?.heading || '#ffffff'} onChange={(v) => setNestedData('footer.colors.heading', v)} />
          <ColorControl label="Text" value={data.footer.colors?.text} onChange={(v) => setNestedData('footer.colors.text', v)} />
        </div>
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
