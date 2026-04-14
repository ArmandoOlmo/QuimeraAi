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


export const renderMapControls = (deps: ControlsDeps) => {
const { data, setNestedData, setAiAssistField, t, activeProject, updateProjectFavicon, menus, categories, navigate, uploadImageAndGetURL, faviconInputRef, isUploadingFavicon, setIsUploadingFavicon, heroProducts, heroCategories, isLoadingHeroProducts, heroProductSearch, setHeroProductSearch, showHeroImagePicker, setShowHeroImagePicker, showHeroPrimaryProductPicker, setShowHeroPrimaryProductPicker, showHeroSecondaryProductPicker, setShowHeroSecondaryProductPicker, showHeroPrimaryCollectionPicker, setShowHeroPrimaryCollectionPicker, showHeroSecondaryCollectionPicker, setShowHeroSecondaryCollectionPicker, heroPrimaryLinkType, setHeroPrimaryLinkType, heroSecondaryLinkType, setHeroSecondaryLinkType, isGeocoding, setIsGeocoding, geocodeError, setGeocodeError, componentStyles, renderListSectionControls } = deps;

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


      <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
        <MapPin size={14} />
        Location
      </label>

      {/* Address input with search button */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Address</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={data?.map.address || ''}
            onChange={(e) => setNestedData('map.address', e.target.value)}
            placeholder="e.g. 123 Main St, City, Country"
            className="flex-1 bg-editor-panel-bg border border-editor-border rounded-md px-3 py-2 text-sm text-editor-text-primary focus:outline-none focus:ring-1 focus:ring-editor-accent transition-all placeholder:text-editor-text-secondary/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                geocodeAddress();
              }
            }}
          />
          <button
            onClick={geocodeAddress}
            disabled={isGeocoding}
            className="px-3 py-2 bg-editor-accent text-white rounded-md hover:bg-editor-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
            title="Search location"
          >
            {isGeocoding ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            <span className="text-xs font-medium">Find</span>
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
            Location set: {data.map.lat.toFixed(4)}, {data.map.lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* Manual coordinate inputs (collapsible) */}
      <details className="mt-3">
        <summary className="text-xs font-medium text-editor-text-secondary cursor-pointer hover:text-editor-text-primary transition-colors">
          Manual coordinates (advanced)
        </summary>
        <div className="grid grid-cols-2 gap-3 mt-2 pl-2 border-l-2 border-editor-border">
          <Input label="Latitude" type="number" step="0.0001" value={data?.map.lat} onChange={(e) => setNestedData('map.lat', parseFloat(e.target.value))} />
          <Input label="Longitude" type="number" step="0.0001" value={data?.map.lng} onChange={(e) => setNestedData('map.lng', parseFloat(e.target.value))} />
        </div>
      </details>

      <div className="mt-2">
        <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">Zoom Level: {data?.map.zoom}</label>
        <input
          type="range" min="1" max="20"
          value={data?.map.zoom || 14}
          onChange={(e) => setNestedData('map.zoom', parseInt(e.target.value))}
          className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
        />
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      <BackgroundImageControl sectionKey="map" data={data} setNestedData={setNestedData} />
      {/* Map Variant */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <Select
          label={t('editor.controls.common.mapStyle')}
          value={data?.map.mapVariant || 'modern'}
          onChange={(v) => setNestedData('map.mapVariant', v)}
          options={[
            { value: 'modern', label: '🏢 Modern Split - Info card + map' },
            { value: 'minimal', label: '✨ Minimal - Clean with badge' },
            { value: 'dark-tech', label: '🌃 Dark Tech - Tech overlay' },
            { value: 'night', label: '🌙 Night Bar - Bottom info bar' }
          ]}
        />
      </div>

      {/* Map Height */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Map Height</label>
          <span className="text-xs text-editor-text-primary">{data?.map.height || 400}px</span>
        </div>
        <input
          type="range" min="200" max="800" step="50"
          value={data?.map.height || 400}
          onChange={(e) => setNestedData('map.height', parseInt(e.target.value))}
          className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
        />
      </div>

      {/* Spacing */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Settings size={14} />
          Spacing
        </label>
        <div className="space-y-1">
          <PaddingSelector label="Vertical" value={data?.map.paddingY || 'md'} onChange={(v) => setNestedData('map.paddingY', v)} />
          <PaddingSelector label="Horizontal" value={data?.map.paddingX || 'md'} onChange={(v) => setNestedData('map.paddingX', v)} />
        </div>
      </div>

      {/* Section Colors */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Palette size={14} />
          Colors
        </label>
        <ColorControl label={t('editor.controls.common.background')} value={data?.map.colors?.background || '#0f172a'} onChange={(v) => setNestedData('map.colors.background', v)} />
        <ColorControl label={t('editor.controls.common.title')} value={data?.map.colors?.heading || '#F9FAFB'} onChange={(v) => setNestedData('map.colors.heading', v)} />
        <ColorControl label="Text" value={data?.map.colors?.text || '#94a3b8'} onChange={(v) => setNestedData('map.colors.text', v)} />
        <ColorControl label="Marker/Accent" value={data?.map.colors?.accent || '#4f46e5'} onChange={(v) => setNestedData('map.colors.accent', v)} />
        {(data?.map.mapVariant === 'modern' || data?.map.mapVariant === 'card-overlay') && (
          <ColorControl label="Card Background" value={data?.map.colors?.cardBackground || '#1e293b'} onChange={(v) => setNestedData('map.colors.cardBackground', v)} />
        )}


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
