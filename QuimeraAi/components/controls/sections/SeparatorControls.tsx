import React from 'react';
import TabbedControls from '../../ui/TabbedControls';
import ColorControl from '../../ui/ColorControl';
import ImagePicker from '../../ui/ImagePicker';
import { ToggleControl } from '../../ui/EditorControlPrimitives';
import { AlignJustify, Image as ImageIcon, Settings, Layers } from 'lucide-react';
import type { ControlsDeps } from '../ControlsShared';

export const renderSeparatorControlsWithTabs = (deps: ControlsDeps, separatorKey: string) => {
  const { data, setNestedData } = deps;

  const contentTab = (
    <div className="space-y-4">
      {/* ========== HEIGHT ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <AlignJustify size={14} />
          Altura
        </label>
        <div className="bg-editor-bg/50 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-editor-text-secondary">Altura del separador</span>
            <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">
              {data[separatorKey as keyof typeof data]?.height || 100}px
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={data[separatorKey as keyof typeof data]?.height || 100}
            onChange={(e) => setNestedData(`${separatorKey}.height`, parseInt(e.target.value))}
            className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
          />
        </div>
      </div>
    </div>
  );

  const styleTab = (
    <div className="space-y-4">
      {/* ========== GLASSMORPHISM ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border space-y-2 mb-4">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers size={14} /> Efecto Cristal
        </label>
        <ToggleControl
          label="Glassmorphism (Transparencia)"
          checked={data[separatorKey as keyof typeof data]?.glassEffect || false}
          onChange={(v) => setNestedData(`${separatorKey}.glassEffect`, v)}
        />
      </div>

      {/* ========== COLORS ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <Settings size={14} />
          Color de Fondo
        </label>
        <ColorControl 
            label="Color" 
            value={data[separatorKey as keyof typeof data]?.color || 'transparent'} 
            onChange={(v) => setNestedData(`${separatorKey}.color`, v)} 
        />
      </div>
      
      {/* ========== BACKGROUND IMAGE ========== */}
      <div className="bg-editor-panel-bg/50 p-4 rounded-lg border border-editor-border">
        <label className="block text-xs font-bold text-editor-text-secondary uppercase mb-3 flex items-center gap-2">
          <ImageIcon size={14} />
          Imagen de Fondo
        </label>
        <ImagePicker
          label="Seleccionar imagen"
          value={data[separatorKey as keyof typeof data]?.backgroundImageUrl || ''}
          onChange={(url) => setNestedData(`${separatorKey}.backgroundImageUrl`, url)}
        />
        
        {data[separatorKey as keyof typeof data]?.backgroundImageUrl && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-editor-text-secondary">Oscurecimiento</span>
              <span className="text-[10px] text-editor-accent font-mono bg-editor-accent/10 px-2 py-0.5 rounded-full">
                {data[separatorKey as keyof typeof data]?.backgroundOverlayOpacity ?? 50}%
              </span>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={data[separatorKey as keyof typeof data]?.backgroundOverlayOpacity ?? 50}
              onChange={(e) => {
                setNestedData(`${separatorKey}.backgroundOverlayOpacity`, parseInt(e.target.value));
                setNestedData(`${separatorKey}.backgroundOverlayEnabled`, true);
              }}
              className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer accent-editor-accent"
            />
          </div>
        )}
      </div>
    </div>
  );

  return <TabbedControls contentTab={contentTab} styleTab={styleTab} />;
};
