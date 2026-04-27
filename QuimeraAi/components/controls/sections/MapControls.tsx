/**
 * MapControls.tsx
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
import { Input, TextArea, Select, ToggleControl, FontSizeSelector, PaddingSelector, BorderRadiusSelector, SliderControl } from '../../ui/EditorControlPrimitives';
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


export const renderMapControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;
  if (!data?.map) return null;

  // Helper function for Nominatim geocoding (OpenStreetMap - free)
  const geocodeWithNominatim = async (address: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { 'User-Agent': 'QuimeraAI/1.0' } }
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

  // Function to geocode address
  const geocodeAddress = async () => {
    const address = data?.map?.address;
    if (!address || address.trim() === '') {
      setGeocodeError('Please enter an address first');
      return;
    }
    setIsGeocoding(true);
    setGeocodeError(null);
    try {
      // Try Google Geocoder first if available
      if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
        try {
          const geocoder = new (window as any).google.maps.Geocoder();
          // Wrap in a promise with timeout to handle all failure modes
          const googleResult = await new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn('Google Geocoder timed out, falling back to Nominatim');
              resolve(false);
            }, 5000);
            
            try {
              geocoder.geocode({ address }, (results: any, status: string) => {
                clearTimeout(timeout);
                if (status === 'OK' && results && results[0]) {
                  const location = results[0].geometry.location;
                  setNestedData('map.lat', location.lat());
                  setNestedData('map.lng', location.lng());
                  setGeocodeError(null);
                  setIsGeocoding(false);
                  resolve(true);
                } else {
                  console.warn(`Google Geocoder returned status: ${status}, falling back to Nominatim`);
                  resolve(false);
                }
              });
            } catch (geocodeCallError) {
              clearTimeout(timeout);
              console.warn('Google geocoder.geocode() threw error:', geocodeCallError);
              resolve(false);
            }
          });
          
          if (googleResult) return; // Google succeeded, we're done
        } catch (googleError) {
          console.warn('Google Geocoder failed, falling back to Nominatim:', googleError);
        }
      }
      // Fallback: always try Nominatim if Google didn't succeed
      await geocodeWithNominatim(address);
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodeError('Error searching location. Please try again.');
      setIsGeocoding(false);
    }
  };

  const contentTab = (
    <div className="space-y-4">
      <Input label={t('editor.controls.common.title')} value={data?.map.title} onChange={(e) => setNestedData('map.title', e.target.value)} />
      <FontSizeSelector label={t('editor.controls.common.titleSize')} value={data?.map.titleFontSize || 'md'} onChange={(v) => setNestedData('map.titleFontSize', v)} />

      <TextArea label={t('editor.controls.common.description')} value={data?.map.description} onChange={(e) => setNestedData('map.description', e.target.value)} rows={2} />
      <FontSizeSelector label={t('editor.controls.common.descriptionSize')} value={data?.map.descriptionFontSize || 'md'} onChange={(v) => setNestedData('map.descriptionFontSize', v)} />

      {/* ── Location ── */}
      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
        <MapPin size={14} />
        {t('controls.map.location', 'Location')}
      </label>

      {/* Address input with search button */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{t('controls.map.address', 'Address')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={data?.map.address || ''}
            onChange={(e) => setNestedData('map.address', e.target.value)}
            placeholder={t('controls.map.addressPlaceholder', 'e.g. 123 Main St, City, Country')}
            className="flex-1 bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                geocodeAddress();
              }
            }}
          />
          <button type="button"             onClick={geocodeAddress}
            disabled={isGeocoding}
            className="px-3 py-2 bg-editor-accent text-white rounded-md hover:bg-editor-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
            title={t('controls.map.searchLocation', 'Search location')}
          >
            {isGeocoding ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            <span className="text-xs font-medium">{t('controls.map.find', 'Find')}</span>
          </button>
        </div>

        {/* Error message */}
        {geocodeError && (
          <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle size={12} />
            {geocodeError}
          </p>
        )}

        {/* Success indicator when coordinates are set */}
        {data?.map.lat && data?.map.lng && !geocodeError && (
          <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
            <MapPin size={12} />
            {t('controls.map.locationSet', 'Location set')}: {data.map.lat.toFixed(4)}, {data.map.lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* Manual coordinate inputs (collapsible) */}
      <details className="mt-3">
        <summary className="text-xs font-medium text-editor-text-secondary cursor-pointer hover:text-editor-text-primary transition-colors">
          {t('controls.map.manualCoordinates', 'Manual coordinates (advanced)')}
        </summary>
        <div className="grid grid-cols-2 gap-3 mt-2 pl-2 border-l-2 border-editor-border">
          <Input label={t('controls.map.latitude', 'Latitude')} type="number" step="0.0001" value={data?.map.lat} onChange={(e) => setNestedData('map.lat', parseFloat(e.target.value))} />
          <Input label={t('controls.map.longitude', 'Longitude')} type="number" step="0.0001" value={data?.map.lng} onChange={(e) => setNestedData('map.lng', parseFloat(e.target.value))} />
        </div>
      </details>

      <div className="mt-2">
        <SliderControl
          label={t('controls.map.zoomLevel', 'Zoom Level')}
          value={data?.map.zoom || 14}
          onChange={(v) => setNestedData('map.zoom', v)}
          min={1} max={20} step={1}
        />
      </div>

      {/* ── Contact Info ── */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-3">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Phone size={14} />
          {t('controls.map.contactInfo', 'Contact Info')}
        </label>
        <Input label={t('controls.map.phone', 'Phone')} value={data?.map.phone || ''} onChange={(e) => setNestedData('map.phone', e.target.value)} placeholder={t('controls.map.phonePlaceholder', 'e.g. +1 (555) 123-4567')} />
        <Input label={t('controls.map.email', 'Email')} value={data?.map.email || ''} onChange={(e) => setNestedData('map.email', e.target.value)} placeholder={t('controls.map.emailPlaceholder', 'e.g. info@business.com')} />
        <Input label={t('controls.map.businessHours', 'Business Hours')} value={data?.map.businessHours || ''} onChange={(e) => setNestedData('map.businessHours', e.target.value)} placeholder={t('controls.map.hoursPlaceholder', 'e.g. Mon-Fri 9:00-18:00')} />
      </div>

      {/* ── Button Text ── */}
      <Input label={t('controls.map.buttonText', 'Button Text')} value={data?.map.buttonText || ''} onChange={(e) => setNestedData('map.buttonText', e.target.value)} placeholder={t('components.map.getDirections', 'Get Directions')} />
    </div>
  );

  const styleTab = (
    <div className="space-y-4">      <BackgroundImageControl sectionKey="map" data={data} setNestedData={setNestedData} />
      {/* Map Variant */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <Select
          label={t('editor.controls.common.mapStyle')}
          value={data?.map.mapVariant || 'modern'}
          onChange={(v) => setNestedData('map.mapVariant', v)}
          options={[
            { value: 'modern', label: t('controls.map.variants.modern', '🏢 Modern Split') },
            { value: 'minimal', label: t('controls.map.variants.minimal', '✨ Minimal') },
            { value: 'dark-tech', label: t('controls.map.variants.darkTech', '🌃 Dark Tech') },
            { value: 'night', label: t('controls.map.variants.night', '🌙 Night Bar') }
          ]}
        />
      </div>

      {/* Map Height */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <SliderControl
          label={t('controls.map.mapHeight', 'Map Height')}
          value={data?.map.height || (data?.map.mapVariant === 'modern' ? 500 : 400)}
          onChange={(v) => setNestedData('map.height', v)}
          min={200} max={800} step={50} suffix="px"
        />
      </div>

      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Settings size={14} />
          {t('controls.map.spacing', 'Spacing')}
        </label>
        <div className="space-y-1">
          <PaddingSelector label={t('controls.map.vertical', 'Vertical')} value={data?.map.paddingY || 'md'} onChange={(v) => setNestedData('map.paddingY', v)} />
          <PaddingSelector label={t('controls.map.horizontal', 'Horizontal')} value={data?.map.paddingX || 'md'} onChange={(v) => setNestedData('map.paddingX', v)} />
        </div>
      </div>

      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          {t('controls.map.colors', 'Colors')}
        </label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.map.colors?.background || '#0f172a'} onChange={(v) => setNestedData('map.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data?.map.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('map.colors.heading', v)} />
        <ColorControl label={t('controls.map.textColor', 'Text')} value={data?.map.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('map.colors.text', v)} />
        <ColorControl label={t('controls.map.accentColor', 'Marker/Accent')} value={data?.map.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('map.colors.accent', v)} />
        <ColorControl label={t('controls.map.buttonBackground', 'Button Background')} value={data?.map.colors?.buttonBackground || data?.map.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('map.colors.buttonBackground', v)} />
        <ColorControl label={t('controls.map.buttonText', 'Button Text')} value={data?.map.colors?.buttonText || '#ffffff'} onChange={(v) => setNestedData('map.colors.buttonText', v)} />
        <ColorControl label={t('controls.map.cardBackground', 'Card/Gradient Background')} value={data?.map.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('map.colors.cardBackground', v)} />

        {/* Corner Gradient */}
        <CornerGradientControl
          enabled={data?.map?.cornerGradient?.enabled || false}
          position={data?.map?.cornerGradient?.position || 'top-left'}
          color={data?.map?.cornerGradient?.color || '#4f46e5'}
          opacity={data?.map?.cornerGradient?.opacity || 30}
          size={data?.map?.cornerGradient?.size || 50}
          onEnabledChange={(v) => setNestedData('map.cornerGradient.enabled', v)}
          onPositionChange={(v) => setNestedData('map.cornerGradient.position', v)}
          onColorChange={(v) => setNestedData('map.cornerGradient.color', v)}
          onOpacityChange={(v) => setNestedData('map.cornerGradient.opacity', v)}
          onSizeChange={(v) => setNestedData('map.cornerGradient.size', v)}
        />
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
