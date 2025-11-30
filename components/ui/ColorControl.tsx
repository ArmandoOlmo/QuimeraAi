import React, { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Sparkles, History } from 'lucide-react';
import { useSafeEditor } from '../../contexts/EditorContext';

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className="w-full bg-editor-border text-editor-text-primary p-2 rounded border border-transparent focus:ring-2 focus:ring-editor-accent focus:outline-none transition-all"
    />
);

const Label: React.FC<{ children: ReactNode, htmlFor?: string }> = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-editor-text-secondary mb-1">{children}</label>
);

const PRESET_COLORS = [
  '#FFFFFF', '#E4E4E7', '#A1A1AA', '#71717A', '#52525B', '#3F3F46', '#27272A', '#18181B',
  '#F87171', '#FB923C', '#FBBF24', '#A3E635', '#4ADE80', '#34D399', '#2DD4BF', '#60A5FA',
  '#818CF8', '#A78BFA', '#C084FC', '#F472B6', '#F43F5E', '#DC2626', '#EA580C', '#D97706',
];

const MAX_RECENT_COLORS = 8;
const RECENT_COLORS_KEY = 'quimera-recent-colors';

// Helper to get recent colors from localStorage
const getRecentColors = (): string[] => {
    try {
        const stored = localStorage.getItem(RECENT_COLORS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Helper to save recent colors to localStorage
const saveRecentColor = (color: string): string[] => {
    try {
        const recent = getRecentColors();
        // Normalize color to uppercase hex for comparison
        const normalizedColor = color.toUpperCase();
        
        // Remove if already exists
        const filtered = recent.filter(c => c.toUpperCase() !== normalizedColor);
        
        // Add to beginning
        const updated = [color, ...filtered].slice(0, MAX_RECENT_COLORS);
        
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
        return updated;
    } catch {
        return [];
    }
};

const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// Color utility functions
const parseColor = (color: string): { hex: string, alpha: number } => {
  if (!color) return { hex: '#000000', alpha: 1 };
  
  // Handle RGBA
  let match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    const toHex = (c: string) => parseInt(c).toString(16).padStart(2, '0');
    return {
      hex: `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`,
      alpha: match[4] !== undefined ? parseFloat(match[4]) : 1,
    };
  }

  // Handle HEX
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length === 8) {
        const alpha = parseInt(hex.slice(6, 8), 16) / 255;
        return { hex: `#${hex.slice(0, 6)}`, alpha: alpha };
    }
    if (hex.length === 6) {
        return { hex: `#${hex}`, alpha: 1 };
    }
  }

  return { hex: '#000000', alpha: 1 }; // Fallback
};

const formatColor = ({ hex, alpha }: { hex: string, alpha: number }): string => {
  if (alpha >= 1) {
    return hex.toLowerCase();
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(2))})`;
};


interface ColorControlProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    /** Colores de la paleta importada para acceso rápido. 
     * Si no se proporciona, se obtiene automáticamente del tema global */
    paletteColors?: string[];
}

const ColorControl: React.FC<ColorControlProps> = ({ label, value, onChange, paletteColors: propPaletteColors }) => {
    // Obtener los colores de la paleta del tema global si no se pasan como prop
    const editor = useSafeEditor();
    const paletteColors = propPaletteColors ?? editor?.theme?.paletteColors;
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const portalContainer = document.getElementById('portal-root');
    
    // Estado local para el input HEX que permite edición manual
    const [hexInput, setHexInput] = useState('');
    
    // Estado para colores recientes
    const [recentColors, setRecentColors] = useState<string[]>(() => getRecentColors());
    
    useClickOutside(popoverRef, () => {
        // Save current color to recent when closing
        if (alpha >= 1 && hex) {
            const updated = saveRecentColor(hex);
            setRecentColors(updated);
        }
        setIsOpen(false);
    });

    useLayoutEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            
            const popoverWidth = 256; // Corresponds to w-64
            const popoverHeight = 340; // Estimated height
            const gap = 8;

            let top = rect.bottom + window.scrollY + gap;
            let left = rect.left + window.scrollX;

            // Adjust vertically if it overflows
            if (top + popoverHeight > window.innerHeight + window.scrollY) {
                top = rect.top + window.scrollY - popoverHeight - gap;
            }

            // Adjust horizontally if it overflows
            if (left + popoverWidth > window.innerWidth + window.scrollX) {
                left = rect.right + window.scrollX - popoverWidth;
            }
            
            if (left < 0) {
                left = gap;
            }

            setPopoverStyle({
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
            });
        }
    }, [isOpen]);

    const { hex, alpha } = parseColor(value);
    
    // Sincronizar hexInput con el valor actual cuando cambia externamente
    useEffect(() => {
        setHexInput(hex.toUpperCase());
    }, [hex]);

    const handleColorChange = (newHex: string, newAlpha: number, saveToRecent: boolean = true) => {
        const formattedColor = formatColor({ hex: newHex, alpha: newAlpha });
        onChange(formattedColor);
        
        // Save to recent colors (only for solid colors, not while dragging)
        if (saveToRecent && newAlpha >= 1) {
            const updated = saveRecentColor(newHex);
            setRecentColors(updated);
        }
    };
    
    // Validar si un string es un color HEX válido
    const isValidHex = (hexString: string): boolean => {
        const cleanHex = hexString.replace('#', '');
        return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/i.test(cleanHex);
    };
    
    // Manejar cambios en el input HEX manual
    const handleHexInputChange = (newHexValue: string) => {
        // Actualizar el estado local inmediatamente para permitir edición
        setHexInput(newHexValue);
        
        // Si el valor es válido, aplicar el cambio
        if (isValidHex(newHexValue)) {
            const normalizedHex = newHexValue.startsWith('#') ? newHexValue : `#${newHexValue}`;
            let processedHex = normalizedHex;
            
            // Expandir formato corto (#RGB a #RRGGBB)
            if (normalizedHex.length === 4) {
                processedHex = '#' + normalizedHex.slice(1).split('').map(c => c + c).join('');
            }
            
            handleColorChange(processedHex, alpha, false);
        }
    };

    const PopoverContent = (
      <div ref={popoverRef} style={popoverStyle} className="z-50 w-64 bg-editor-panel-bg p-3 rounded-lg shadow-2xl border border-editor-border">
          <div className="space-y-3">
              <div 
                  className="w-full h-32 rounded cursor-pointer border-2 border-editor-border" 
                  style={{ backgroundColor: hex }}
                  onClick={() => colorInputRef.current?.click()}
              >
                  <input
                      ref={colorInputRef}
                      type="color"
                      value={hex}
                      onChange={(e) => handleColorChange(e.target.value, alpha, false)}
                      onBlur={(e) => {
                          // Save to recent when user finishes picking
                          if (alpha >= 1) {
                              const updated = saveRecentColor(e.target.value);
                              setRecentColors(updated);
                          }
                      }}
                      className="opacity-0 w-0 h-0 absolute"
                  />
              </div>
              <div className="flex items-center space-x-2">
                  <div className="flex-grow">
                      <Label htmlFor="hex-input">HEX</Label>
                      <Input 
                          id="hex-input"
                          value={hexInput} 
                          onChange={(e) => handleHexInputChange(e.target.value)}
                          onPaste={(e) => {
                              e.stopPropagation();
                              const pastedText = e.clipboardData.getData('text');
                              if (pastedText) {
                                  setTimeout(() => handleHexInputChange(pastedText), 0);
                              }
                          }}
                          className="font-mono"
                          placeholder="#000000"
                      />
                  </div>
                  <div className="w-20">
                      <Label htmlFor="alpha-input">Opacity</Label>
                      <Input 
                          id="alpha-input"
                          type="number" 
                          min="0" max="100" 
                          value={Math.round(alpha * 100)} 
                          onChange={(e) => handleColorChange(hex, parseInt(e.target.value) / 100, false)}
                      />
                  </div>
              </div>
              <div>
                  <input 
                      type="range"
                      min="0" max="1" step="0.01"
                      value={alpha}
                      onChange={(e) => handleColorChange(hex, parseFloat(e.target.value), false)}
                      className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                  />
              </div>
              <hr className="border-editor-border/50" />
              
              {/* Recent Colors - colores usados recientemente */}
              {recentColors.length > 0 && (
                  <div>
                      <div className="flex items-center gap-1.5 mb-2">
                          <History size={12} className="text-editor-accent" />
                          <span className="text-[10px] font-semibold text-editor-accent uppercase tracking-wider">
                              Recientes
                          </span>
                      </div>
                      <div className="flex gap-1.5 mb-3">
                          {recentColors.map((color, idx) => (
                              <button
                                  key={`recent-${idx}`}
                                  title={color}
                                  className="flex-1 h-7 rounded-md transition-all hover:scale-105 hover:ring-2 hover:ring-editor-accent/50 focus:outline-none focus:ring-2 focus:ring-editor-accent border border-white/10 shadow-sm"
                                  style={{ backgroundColor: color }}
                                  onClick={() => handleColorChange(color, 1, false)}
                              />
                          ))}
                      </div>
                      <hr className="border-editor-border/50 mb-3" />
                  </div>
              )}
              
              {/* Palette Colors - colores de la paleta importada de Coolors.co */}
              {paletteColors && paletteColors.length > 0 && (
                  <div>
                      <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles size={12} className="text-purple-400" />
                          <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                              Paleta Importada
                          </span>
                      </div>
                      <div className="flex gap-1.5 mb-3">
                          {paletteColors.map((color, idx) => (
                              <button
                                  key={`palette-${idx}`}
                                  title={color}
                                  className="flex-1 h-8 rounded-md transition-all hover:scale-105 hover:ring-2 hover:ring-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400 border border-white/10 shadow-sm"
                                  style={{ backgroundColor: color }}
                                  onClick={() => handleColorChange(color, 1)}
                              />
                          ))}
                      </div>
                      <hr className="border-editor-border/50 mb-3" />
                  </div>
              )}
              
              {/* Preset Colors */}
              <div className="flex items-center gap-1.5 mb-2">
                  <Palette size={12} className="text-editor-text-secondary" />
                  <span className="text-[10px] font-medium text-editor-text-secondary uppercase tracking-wider">
                      Presets
                  </span>
              </div>
              <div className="grid grid-cols-8 gap-1">
                  {PRESET_COLORS.map(color => (
                      <button
                          key={color}
                          title={color}
                          className="w-full h-6 rounded-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-editor-accent"
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorChange(color, 1)}
                      />
                  ))}
              </div>
          </div>
      </div>
    );

    return (
        <div>
            <Label>{label}</Label>
            <div>
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center space-x-2 bg-editor-border p-1 pr-2 rounded border border-transparent focus-within:ring-2 focus-within:ring-editor-accent transition-all"
                >
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: value }}></div>
                    <span className="flex-grow text-left text-editor-text-primary font-mono text-sm truncate">{value}</span>
                </button>
                {isOpen && portalContainer && createPortal(PopoverContent, portalContainer)}
            </div>
        </div>
    );
};

export default ColorControl;
