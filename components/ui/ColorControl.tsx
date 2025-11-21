import React, { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

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


const ColorControl: React.FC<{ label: string; value: string; onChange: (value: string) => void; }> = ({ label, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const portalContainer = document.getElementById('portal-root');
    
    useClickOutside(popoverRef, () => setIsOpen(false));

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

    const handleColorChange = (newHex: string, newAlpha: number) => {
        onChange(formatColor({ hex: newHex, alpha: newAlpha }));
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
                      onChange={(e) => handleColorChange(e.target.value, alpha)}
                      className="opacity-0 w-0 h-0 absolute"
                  />
              </div>
              <div className="flex items-center space-x-2">
                  <div className="flex-grow">
                      <Label htmlFor="hex-input">HEX</Label>
                      <Input 
                          id="hex-input"
                          value={hex.toUpperCase()} 
                          onChange={(e) => handleColorChange(e.target.value, alpha)}
                          className="font-mono"
                      />
                  </div>
                  <div className="w-20">
                      <Label htmlFor="alpha-input">Opacity</Label>
                      <Input 
                          id="alpha-input"
                          type="number" 
                          min="0" max="100" 
                          value={Math.round(alpha * 100)} 
                          onChange={(e) => handleColorChange(hex, parseInt(e.target.value) / 100)}
                      />
                  </div>
              </div>
              <div>
                  <input 
                      type="range"
                      min="0" max="1" step="0.01"
                      value={alpha}
                      onChange={(e) => handleColorChange(hex, parseFloat(e.target.value))}
                      className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                  />
              </div>
              <hr className="border-editor-border/50" />
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
