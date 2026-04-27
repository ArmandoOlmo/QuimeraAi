/**
 * ControlsShared.tsx
 *
 * Shared types, interfaces, and helper components extracted from Controls.tsx.
 * These are used across all section control modules.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GripVertical, ChevronDown, Trash2, Palette, X, Image, Grid, Zap,
  ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, CircleDot, ArrowRight,
  ArrowDownLeft, ArrowDown, ArrowDownRight,
} from 'lucide-react';
import ColorControl from '../ui/ColorControl';
import ImagePicker from '../ui/ImagePicker';
import { ToggleControl, PositionGridControl, SliderControl } from '../ui/EditorControlPrimitives';

// ─── Shared Props Interface ─────────────────────────────────────────────────
export interface SectionControlsProps {
  data: any;
  setNestedData: (path: string, value: any) => void;
  /** For AI text assist in text fields */
  setAiAssistField?: (field: { path: string; value: string; context: string } | null) => void;
  /** For file uploads */
  uploadImageAndGetURL?: (...args: any[]) => Promise<string>;
  /** Active project reference (used by header for favicon, etc.) */
  activeProject?: any;
  /** Update project favicon (header-specific) */
  updateProjectFavicon?: (projectId: string, file: File) => Promise<void>;
  /** CMS menus (header-specific) */
  menus?: any[];
  /** CMS categories */
  categories?: any[];
  /** Navigation function */
  navigate?: (route: string) => void;
}

// ─── extractVideoId ─────────────────────────────────────────────────────────
export const extractVideoId = (input: string, source: string): string => {
  if (!input) return '';
  const trimmed = input.trim();

  if (source === 'youtube') {
    const patterns = [
      /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
      /(?:youtu\.be\/)([\w-]{11})/,
      /(?:youtube\.com\/embed\/)([\w-]{11})/,
      /(?:youtube\.com\/shorts\/)([\w-]{11})/,
      /(?:youtube\.com\/live\/)([\w-]{11})/,
      /(?:youtube\.com\/v\/)([\w-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) return match[1];
    }
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
    return trimmed;
  }

  if (source === 'vimeo') {
    const match = trimmed.match(/(?:vimeo\.com\/)([\d]+)/);
    if (match) return match[1];
    if (/^\d+$/.test(trimmed)) return trimmed;
    return trimmed;
  }

  return trimmed;
};

// ─── CornerGradientControl ──────────────────────────────────────────────────
export interface CornerGradientControlProps {
  enabled: boolean;
  position: 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  color: string;
  opacity: number;
  size: number;
  onEnabledChange: (enabled: boolean) => void;
  onPositionChange: (position: 'none' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  onColorChange: (color: string) => void;
  onOpacityChange: (opacity: number) => void;
  onSizeChange: (size: number) => void;
}

export const CornerGradientControl: React.FC<CornerGradientControlProps> = ({
  enabled, position, color, opacity, size,
  onEnabledChange, onPositionChange, onColorChange, onOpacityChange, onSizeChange,
}) => {
  const { t } = useTranslation();
  const cornerPositions = [
    { value: 'top-left', icon: ArrowUpLeft, title: t('editor.controls.startPosition') + ' TL' },
    { value: 'top-right', icon: ArrowUpRight, title: t('editor.controls.startPosition') + ' TR' },
    { value: 'bottom-left', icon: ArrowDownLeft, title: t('editor.controls.startPosition') + ' BL' },
    { value: 'bottom-right', icon: ArrowDownRight, title: t('editor.controls.startPosition') + ' BR' },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <Palette size={14} />
          {t('editor.controls.cornerGradient')}
        </label>
        <ToggleControl checked={enabled} onChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-3 animate-fade-in-up bg-editor-bg/50 p-3 rounded-lg">
          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
              {t('editor.controls.startPosition')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {cornerPositions.map((pos) => {
                const Icon = pos.icon;
                return (
                  <button
                    key={pos.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onPositionChange(pos.value);
                    }}
                    className={`py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${position === pos.value
                      ? 'bg-editor-accent text-editor-bg'
                      : 'bg-editor-panel-bg text-editor-text-secondary hover:bg-editor-border border border-editor-border'
                      }`}
                    title={pos.title}
                  >
                    <Icon size={15} />
                    <span className="text-xs">{pos.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <ColorControl label={t('editor.controls.gradientColor')} value={color} onChange={onColorChange} />

          <SliderControl
            label={t('editor.controls.opacity')}
            value={opacity}
            onChange={(v) => onOpacityChange(v)}
            min={5} max={100} step={5} suffix="%"
          />

          <SliderControl
            label={t('editor.controls.size')}
            value={size}
            onChange={(v) => onSizeChange(v)}
            min={20} max={100} step={5} suffix="%"
          />
            <p className="text-xs text-editor-text-secondary mt-1 italic">
              {t('editor.controls.size')}
            </p>

          <div>
            <label className="block text-xs font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
              {t('editor.controls.preview')}
            </label>
            <div className="w-full h-20 rounded-md border border-editor-border relative overflow-hidden"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div className="absolute inset-0" style={{
                background: (() => {
                  const gradientDirections: Record<string, string> = {
                    'top-left': 'to bottom right', 'top-right': 'to bottom left',
                    'bottom-left': 'to top right', 'bottom-right': 'to top left',
                  };
                  const direction = gradientDirections[position] || 'to bottom right';
                  const hexToRgba = (hex: string, alpha: number) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                  };
                  return `linear-gradient(${direction}, ${hexToRgba(color, opacity / 100)} 0%, transparent ${size}%)`;
                })()
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── AccordionItem ──────────────────────────────────────────────────────────
export interface AccordionItemProps {
  title: string;
  icon?: React.ElementType;
  isOpen: boolean;
  onDoubleClick: () => void;
  isVisible: boolean;
  onToggleVisibility: (val: boolean) => void;
  children: React.ReactNode;
  dragHandlers?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  onRemove?: () => void;
  canRemove?: boolean;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  title, icon: Icon, isOpen, onDoubleClick, isVisible,
  onToggleVisibility, children, dragHandlers, onRemove, canRemove = false,
}) => {
  return (
    <div
      className={`border-b border-editor-border bg-editor-bg transition-colors ${isOpen ? 'bg-editor-bg' : ''}`}
      style={dragHandlers?.style}
      onDragOver={dragHandlers?.draggable ? dragHandlers.onDragOver : undefined}
      onDrop={dragHandlers?.draggable ? dragHandlers.onDrop : undefined}
    >
      <div className={`flex items-center justify-between p-4 hover:bg-editor-panel-bg/50 transition-colors select-none ${isOpen ? 'bg-editor-panel-bg/50' : ''}`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {dragHandlers?.draggable && (
            <div
              className="text-editor-text-secondary hover:text-editor-text-primary -ml-1 cursor-grab active:cursor-grabbing flex-shrink-0"
              draggable={true}
              onDragStart={dragHandlers.onDragStart}
              onDragEnd={dragHandlers.onDragEnd}
            >
              <GripVertical size={16} />
            </div>
          )}
          <div
            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDoubleClick(); }}
          >
            {Icon && <Icon size={18} className={`text-editor-text-secondary ${isOpen ? 'text-editor-accent' : ''} flex-shrink-0 transition-colors duration-200`} />}
            <span className={`font-semibold text-sm ${isOpen ? 'text-editor-accent' : 'text-editor-text-primary'} truncate transition-colors duration-200`}>{title}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
              className="p-1 text-editor-text-secondary hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <ToggleControl checked={isVisible} onChange={onToggleVisibility} />
          <button type="button" className="cursor-pointer p-1 hover:bg-editor-panel-bg rounded transition-colors"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDoubleClick(); }}
          >
            <span className={`block transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
              <ChevronDown size={16} className="text-editor-text-secondary" />
            </span>
          </button>
        </div>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-4 bg-editor-panel-bg border-t border-editor-border cursor-default">
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── BackgroundImageControl ─────────────────────────────────────────────────
export const BackgroundImageControl: React.FC<{
  sectionKey: string;
  data: any;
  setNestedData: (path: string, value: any) => void;
}> = ({ sectionKey, data, setNestedData }) => {
  const { t } = useTranslation();
  const sectionData = (data as any)?.[sectionKey];
  const hasImage = !!sectionData?.backgroundImageUrl;
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
      <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
        <Image size={14} />
        {t('editor.controls.common.backgroundImage', 'Background Image')}
      </label>

      <div className="relative rounded-lg overflow-hidden border border-editor-border group">
        {hasImage ? (
          <>
            <div className="aspect-video">
              <img src={sectionData.backgroundImageUrl} alt="Background" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setShowPicker(true); }}
                className="p-2 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-all duration-200"
                title={t('dashboard.imagePicker.openLibrary')}>
                <Grid size={14} />
              </button>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setShowPicker(true); }}
                className="p-2 rounded-lg bg-editor-accent/80 backdrop-blur-md border border-editor-accent/40 text-white hover:bg-editor-accent transition-all duration-200"
                title={t('dashboard.imagePicker.generateWithAI')}>
                <Zap size={14} />
              </button>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setNestedData(`${sectionKey}.backgroundImageUrl`, ''); }}
                className="p-2 rounded-lg bg-red-500/60 backdrop-blur-md border border-red-500/30 text-white hover:bg-red-500/80 transition-all duration-200"
                title={t('common.remove')}>
                <X size={14} />
              </button>
            </div>
          </>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center bg-editor-bg text-editor-text-secondary gap-2">
            <Image size={32} className="opacity-30" />
            <span className="text-[10px] uppercase tracking-wider opacity-50">Sin imagen</span>
          </div>
        )}
      </div>

      {showPicker && (
        <ImagePicker label="" value={sectionData?.backgroundImageUrl || ''}
          onChange={(url) => setNestedData(`${sectionKey}.backgroundImageUrl`, url)}
          generationContext="background" defaultOpen onClose={() => setShowPicker(false)}
        />
      )}

      {!hasImage && (
        <div className="flex gap-2 mt-3">
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); setShowPicker(true); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-bg border border-editor-border text-editor-text-secondary hover:text-editor-text-primary hover:border-editor-accent/30 transition-all text-xs font-medium">
            <Grid size={12} /> Librería
          </button>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); setShowPicker(true); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-editor-accent/10 border border-editor-accent/20 text-editor-accent hover:bg-editor-accent/20 transition-all text-xs font-medium">
            <Zap size={12} /> Generar IA
          </button>
        </div>
      )}

      {hasImage && (
        <div className="mt-4 pt-4 border-t border-editor-border/50 space-y-3 animate-fade-in-up">
          <h5 className="text-xs font-bold text-editor-text-secondary uppercase tracking-wider">Overlay</h5>
          <ToggleControl
            label={t('editor.controls.common.enableOverlay')}
            checked={sectionData?.backgroundOverlayEnabled !== false}
            onChange={(v) => setNestedData(`${sectionKey}.backgroundOverlayEnabled`, v)}
          />
          {sectionData?.backgroundOverlayEnabled !== false && (
            <div className="space-y-3 animate-fade-in-up">
              <ColorControl
                label={t('editor.controls.common.overlayColor')}
                value={sectionData?.backgroundOverlayColor || sectionData?.colors?.background || '#000000'}
                onChange={(v) => setNestedData(`${sectionKey}.backgroundOverlayColor`, v)}
              />
              <SliderControl
                label="Overlay Opacity"
                value={sectionData?.backgroundOverlayOpacity ?? 60}
                onChange={(v) => setNestedData(`${sectionKey}.backgroundOverlayOpacity`, v)}
                min={0} max={100} step={5} suffix="%"
              />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-editor-text-secondary/50">Claro</span>
                  <span className="text-[9px] text-editor-text-secondary/50">Oscuro</span>
                </div>
            </div>
          )}

          <PositionGridControl
            label={t('editor.controls.common.bgPosition', 'Posición de Enfoque')}
            value={sectionData?.backgroundPosition || 'center center'}
            onChange={(val) => setNestedData(`${sectionKey}.backgroundPosition`, val)}
          />
        </div>
      )}
    </div>
  );
};

// ─── CardGlowControl ────────────────────────────────────────────────────────
export interface CardGlowControlProps {
  enabled: boolean;
  color: string;
  intensity: number;
  borderRadius: number;
  gradientStart: string;
  gradientEnd: string;
  onEnabledChange: (enabled: boolean) => void;
  onColorChange: (color: string) => void;
  onIntensityChange: (intensity: number) => void;
  onBorderRadiusChange: (radius: number) => void;
  onGradientStartChange: (color: string) => void;
  onGradientEndChange: (color: string) => void;
}

export const CardGlowControl: React.FC<CardGlowControlProps> = ({
  enabled, color, intensity, borderRadius, gradientStart, gradientEnd,
  onEnabledChange, onColorChange, onIntensityChange, onBorderRadiusChange, onGradientStartChange, onGradientEndChange
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
          <Zap size={14} />
          Neon Inner Glow
        </label>
        <ToggleControl checked={enabled} onChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-5 animate-fade-in-up pt-2">
          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider">
              Glow Effect
            </label>
            <ColorControl label="Neon Glow" value={color} onChange={onColorChange} />
            <SliderControl
              label="Intensity"
              value={intensity}
              onChange={(v) => onIntensityChange(v)}
              min={0} max={100} step={5} suffix="%"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-editor-text-secondary uppercase tracking-wider">
              Background Gradient
            </label>
            <ColorControl label="Start Color" value={gradientStart} onChange={onGradientStartChange} />
            <ColorControl label="End Color" value={gradientEnd} onChange={onGradientEndChange} />
          </div>

          <SliderControl
            label="Border Radius"
            value={borderRadius}
            onChange={(v) => onBorderRadiusChange(v)}
            min={0} max={100} step={1} suffix="px"
          />
          
          <div>
            <label className="block text-[10px] font-bold text-editor-text-secondary mb-2 uppercase tracking-wider">
              {t('editor.controls.preview')}
            </label>
            <div className="w-full h-24 relative overflow-hidden rounded-xl border border-editor-border shadow-inner">
               <div className="w-full h-full" style={{
                  background: `linear-gradient(180deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
                  borderRadius: 'inherit',
                  boxShadow: `
                    inset 0px ${-80 * (intensity / 100)}px ${60 * (intensity / 100)}px ${-30 * (intensity / 100)}px ${color},
                    inset 0px ${-40 * (intensity / 100)}px ${30 * (intensity / 100)}px ${-8 * (intensity / 100)}px ${color},
                    inset 0px ${-20 * (intensity / 100)}px ${20 * (intensity / 100)}px ${-6 * (intensity / 100)}px rgba(255, 255, 255, 0.4),
                    inset 0px ${6 * (intensity / 100)}px ${6 * (intensity / 100)}px ${-2 * (intensity / 100)}px rgba(255, 255, 255, 0.15)
                  `
               }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TopDotsControl ─────────────────────────────────────────────────────────
export const TopDotsControl: React.FC<{
  sectionKey: string;
  data: any;
  setNestedData: (path: string, value: any) => void;
}> = ({ sectionKey, data, setNestedData }) => {
  const sectionData = data?.[sectionKey] || {};
  const dotColors = sectionData.dotColors || ['#FF5F56', '#FFBD2E', '#27C93F'];

  return (
    <div className="space-y-2 mt-4 pt-4 border-t border-editor-border/50">
      <ToggleControl
        label="Mostrar Puntos Decorativos (Dots)"
        checked={sectionData.showTopDots ?? true}
        onChange={(v) => setNestedData(`${sectionKey}.showTopDots`, v)}
      />
      {sectionData.showTopDots !== false && (
        <div className="space-y-4 mt-2 p-3 bg-editor-bg border border-editor-border rounded-lg">
          <SliderControl
            label="Cantidad de Dots"
            value={dotColors.length}
            onChange={(v) => {
              const newColors = [...dotColors];
              if (v > newColors.length) {
                const lastColor = newColors[newColors.length - 1] || '#ffffff';
                while (newColors.length < v) {
                  newColors.push(lastColor);
                }
              } else if (v < newColors.length) {
                newColors.length = v;
              }
              setNestedData(`${sectionKey}.dotColors`, newColors);
            }}
            min={1} max={10} step={1}
          />
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-editor-text-secondary uppercase">Colores de los Dots</label>
            <div className="flex flex-wrap gap-2">
              {dotColors.map((color: string, i: number) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <ColorControl
                    label=""
                    compact={true}
                    value={color}
                    onChange={(newColor) => {
                      const newColors = [...dotColors];
                      newColors[i] = newColor;
                      setNestedData(`${sectionKey}.dotColors`, newColors);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ControlsDeps ───────────────────────────────────────────────────────────
// Interface capturing the closure variables that section render functions need
export interface ControlsDeps {
  data: any;
  setNestedData: (path: string, value: any) => void;
  setAiAssistField: (field: { path: string; value: string; context: string } | null) => void;
  t: (key: string, opts?: any) => string;
  activeProject?: any;
  updateProjectFavicon?: (projectId: string, file: File) => Promise<void>;
  menus?: any[];
  categories?: any[];
  navigate?: (route: string) => void;
  uploadImageAndGetURL?: (...args: any[]) => Promise<string>;
  [key: string]: any;
}
