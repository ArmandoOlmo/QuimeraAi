import React, { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Sparkles, History, ChevronDown } from 'lucide-react';
import { useSafeProject } from '../../contexts/project';

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


// Helper for HSV conversions
const hexToHsv = (hexInput: string) => {
    // First normalize the hex through parseColor to handle various formats
    const normalizedHex = parseColor(hexInput).hex;

    // Extract RGB values from the normalized hex
    const r = parseInt(normalizedHex.substring(1, 3), 16) / 255;
    const g = parseInt(normalizedHex.substring(3, 5), 16) / 255;
    const b = parseInt(normalizedHex.substring(5, 7), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToHex = (h: number, s: number, v: number) => {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = (v / 100) * (1 - s / 100);
    const q = (v / 100) * (1 - f * s / 100);
    const t = (v / 100) * (1 - (1 - f) * s / 100);
    const val = v / 100;

    switch (i % 6) {
        case 0: r = val; g = t; b = p; break;
        case 1: r = q; g = val; b = p; break;
        case 2: r = p; g = val; b = t; break;
        case 3: r = p; g = q; b = val; break;
        case 4: r = t; g = p; b = val; break;
        case 5: r = val; g = p; b = q; break;
    }

    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

interface RecentPalette {
    id: string;
    name: string;
    preview: string[];
}

interface ColorControlProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    /** Colores de la paleta importada para acceso rápido.
     * Si no se proporciona, se obtiene automáticamente del tema global */
    paletteColors?: string[];
    /** Paletas usadas recientemente para acceso rápido */
    recentPalettes?: RecentPalette[];
}

const ColorControl: React.FC<ColorControlProps> = ({ label, value, onChange, paletteColors: propPaletteColors, recentPalettes }) => {
    // Obtener los colores de la paleta del tema global si no se pasan como prop
    const project = useSafeProject();
    const paletteColors = propPaletteColors ?? project?.theme?.paletteColors;
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const saturationRef = useRef<HTMLDivElement>(null);

    // State
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const portalContainer = document.getElementById('portal-root');
    const { hex, alpha } = parseColor(value);

    // Derived state for local editing
    const [localHsv, setLocalHsv] = useState({ h: 0, s: 0, v: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Sync local HSV when value changes externally
    useEffect(() => {
        if (!isDragging) {
            setLocalHsv(hexToHsv(hex));
        }
    }, [hex, isDragging]);

    // Helper to get raw RGB numbers from hex
    function parseColorToRgb(h: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

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
            const popoverWidth = 256; // w-64
            const popoverHeight = 500;
            const gap = 8;
            let top = rect.bottom + gap;
            let left = rect.left;
            if (top + popoverHeight > window.innerHeight) top = rect.top - popoverHeight - gap;
            if (top < gap) top = gap;
            if (left + popoverWidth > window.innerWidth) left = window.innerWidth - popoverWidth - gap;
            if (left < gap) left = gap;

            setPopoverStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                width: '256px',
            });
        }
    }, [isOpen]);

    const safeValue = value || formatColor({ hex, alpha });
    const [recentColors, setRecentColors] = useState<string[]>(() => getRecentColors());

    // Local state for controlled inputs
    const [hexInputValue, setHexInputValue] = useState(hex.toUpperCase());
    const [localRgb, setLocalRgb] = useState(() => parseColorToRgb(hex));

    // Sync hex input with external value changes
    useEffect(() => {
        setHexInputValue(hex.toUpperCase());
        setLocalRgb(parseColorToRgb(hex));
    }, [hex]);

    // Load recent colors from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(RECENT_COLORS_KEY);
        if (saved) {
            try {
                setRecentColors(JSON.parse(saved));
            } catch (e) {
                console.error('Error parsing recent colors', e);
            }
        }
    }, []);


    const handleColorChange = (newColor: string) => {
        onChange(newColor);
        // The addToRecent logic is now handled on popover close
    };

    const addToRecent = (color: string) => {
        if (!color) return;
        const newRecent = [color, ...recentColors.filter(c => c !== color)].slice(0, MAX_RECENT_COLORS);
        setRecentColors(newRecent);
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(newRecent));
    };

    const handleSaturationChange = (e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
        if (!saturationRef.current) return;
        const rect = saturationRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        let left = (clientX - rect.left) / rect.width;
        let top = (clientY - rect.top) / rect.height;

        left = Math.max(0, Math.min(1, left));
        top = Math.max(0, Math.min(1, top));

        const newS = left * 100;
        const newV = (1 - top) * 100;

        setLocalHsv(prev => {
            const next = { ...prev, s: newS, v: newV };
            handleColorChange(formatColor({ hex: hsvToHex(next.h, next.s, next.v), alpha }));
            return next;
        });
    };

    const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newH = parseFloat(e.target.value);
        setLocalHsv(prev => {
            const next = { ...prev, h: newH };
            handleColorChange(formatColor({ hex: hsvToHex(next.h, next.s, next.v), alpha }));
            return next;
        });
    };

    const handleRgbChange = (key: 'r' | 'g' | 'b', val: string) => {
        const num = parseInt(val);
        if (isNaN(num)) return;
        const clamped = Math.max(0, Math.min(255, num));

        const newRgb = { ...parseColorToRgb(hex), [key]: clamped };
        const newHex = `#${newRgb.r.toString(16).padStart(2, '0')}${newRgb.g.toString(16).padStart(2, '0')}${newRgb.b.toString(16).padStart(2, '0')}`;
        handleColorChange(formatColor({ hex: newHex, alpha }));
    };

    const PopoverContent = (
        <div
            ref={popoverRef}
            style={popoverStyle}
            className="z-[9999] bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl p-3 overflow-y-auto max-h-[85vh]"
        >
            {/* Custom Saturation Area */}
            <div
                ref={saturationRef}
                className="relative w-full h-32 rounded-md cursor-crosshair overflow-hidden mb-3"
                style={{
                    backgroundColor: `hsl(${localHsv.h}, 100%, 50%)`,
                    backgroundImage: `
                        linear-gradient(to top, #000, transparent),
                        linear-gradient(to right, #fff, transparent)
                    `
                }}
                onMouseDown={(e) => {
                    setIsDragging(true);
                    handleSaturationChange(e);
                }}
                onMouseMove={(e) => {
                    if (isDragging) handleSaturationChange(e);
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
            >
                <div
                    className="absolute w-4 h-4 rounded-full border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                        left: `${localHsv.s}%`,
                        top: `${100 - localHsv.v}%`,
                        backgroundColor: hex
                    }}
                />
            </div>

            {/* Hue Slider */}
            <div className="mb-3">
                <Label>Hue</Label>
                <input
                    type="range"
                    min="0"
                    max="360"
                    value={localHsv.h}
                    onChange={handleHueChange}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                        background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                    }}
                />
            </div>

            {/* Alpha slider */}
            <div className="mb-3">
                <Label>Opacity: {Math.round(alpha * 100)}%</Label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={alpha}
                    onChange={(e) => handleColorChange(formatColor({ hex, alpha: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                />
            </div>

            {/* Hex input */}
            <div className="mb-3">
                <Label>HEX</Label>
                <Input
                    type="text"
                    value={hexInputValue}
                    onChange={(e) => {
                        let val = e.target.value.toUpperCase();
                        // Ensure # prefix
                        if (!val.startsWith('#')) val = '#' + val.replace('#', '');
                        // Only allow valid hex characters
                        val = val.replace(/[^#0-9A-F]/gi, '').slice(0, 7);
                        setHexInputValue(val);
                        // Apply color when valid 7-char hex (including #)
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                            handleColorChange(formatColor({ hex: val, alpha }));
                        }
                    }}
                    onBlur={() => {
                        // Reset to current hex if invalid on blur
                        if (!/^#[0-9A-F]{6}$/i.test(hexInputValue)) {
                            setHexInputValue(hex.toUpperCase());
                        }
                    }}
                    placeholder="#000000"
                />
            </div>

            {/* RGB Inputs */}
            <div className="mb-3">
                <Label>RGB</Label>
                <div className="grid grid-cols-3 gap-2">
                    {(['r', 'g', 'b'] as const).map((k) => (
                        <div key={k} className="flex flex-col items-center">
                            <span className="text-[10px] text-editor-text-secondary uppercase mb-1">{k}</span>
                            <input
                                type="number"
                                min="0"
                                max="255"
                                value={localRgb[k]}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const num = parseInt(val);
                                    // Allow empty string for typing
                                    if (val === '') {
                                        setLocalRgb(prev => ({ ...prev, [k]: 0 }));
                                        return;
                                    }
                                    if (isNaN(num)) return;
                                    const clamped = Math.max(0, Math.min(255, num));
                                    const newRgb = { ...localRgb, [k]: clamped };
                                    setLocalRgb(newRgb);
                                    const newHex = `#${newRgb.r.toString(16).padStart(2, '0')}${newRgb.g.toString(16).padStart(2, '0')}${newRgb.b.toString(16).padStart(2, '0')}`;
                                    handleColorChange(formatColor({ hex: newHex, alpha }));
                                }}
                                className="w-full bg-editor-border text-editor-text-primary p-1.5 rounded border border-transparent focus:ring-1 focus:ring-editor-accent focus:outline-none text-center text-xs"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Palette colors from theme */}
            {paletteColors && paletteColors.length > 0 && (
                <div className="mb-3">
                    <Label><Palette size={12} className="inline mr-1" />Theme Palette</Label>
                    <div className="flex flex-wrap gap-1">
                        {paletteColors.map((color, i) => (
                            <button
                                key={`palette-${i}`}
                                onClick={() => handleColorChange(color)}
                                className="rounded border border-editor-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: color, width: 24, height: 24, minWidth: 24, minHeight: 24, maxWidth: 24, maxHeight: 24 }}
                                title={color}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Recent palettes */}
            {recentPalettes && recentPalettes.length > 0 && (
                <div className="mb-3">
                    <Label><History size={12} className="inline mr-1" />Recent Palettes</Label>
                    <div className="space-y-1">
                        {recentPalettes.slice(0, 5).map((palette) => (
                            <div key={palette.id} className="flex items-center gap-1 p-1 rounded bg-editor-border/30 hover:bg-editor-border/50 transition-colors min-w-0">
                                <span className="text-[10px] text-editor-text-secondary truncate max-w-[60px] shrink-0" title={palette.name}>
                                    {palette.name}:
                                </span>
                                <div className="flex gap-0.5 flex-1 min-w-0">
                                    {palette.preview.slice(0, 5).map((color, idx) => (
                                        <button
                                            key={`${palette.id}-${idx}`}
                                            onClick={() => handleColorChange(color)}
                                            className="w-5 h-5 shrink-0 rounded border border-editor-border hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={`${palette.name}: ${color}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Preset colors */}
            <div className="mb-3">
                <Label><Sparkles size={12} className="inline mr-1" />Presets</Label>
                <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((color, i) => (
                        <button
                            key={`preset-${i}`}
                            onClick={() => handleColorChange(color)}
                            className="rounded border border-editor-border hover:scale-110 transition-transform"
                            style={{ backgroundColor: color, width: 24, height: 24, minWidth: 24, minHeight: 24, maxWidth: 24, maxHeight: 24 }}
                            title={color}
                        />
                    ))}
                </div>
            </div>

            {/* Recent colors */}
            {recentColors.length > 0 && (
                <div>
                    <Label><History size={12} className="inline mr-1" />Recent</Label>
                    <div className="flex flex-wrap gap-1">
                        {recentColors.map((color, i) => (
                            <button
                                key={`recent-${i}`}
                                onClick={() => handleColorChange(color)}
                                className="rounded border border-editor-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: color, width: 24, height: 24, minWidth: 24, minHeight: 24, maxWidth: 24, maxHeight: 24 }}
                                title={color}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="mb-3">
            {label && <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">{label}</label>}
            <div className="relative">
                <button
                    ref={triggerRef}
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center gap-2 bg-editor-panel-bg border border-editor-border rounded-md px-2 py-1.5 text-sm text-editor-text-primary hover:border-editor-accent transition-colors group"
                >
                    <div className="w-6 h-6 rounded border border-editor-border shadow-sm flex items-center justify-center overflow-hidden bg-checkered">
                        <div className="w-full h-full" style={{ backgroundColor: safeValue }} />
                    </div>
                    <span className="flex-1 text-left font-mono text-xs">{safeValue.toUpperCase()}</span>
                    <ChevronDown size={14} className="text-editor-text-secondary group-hover:text-editor-text-primary" />
                </button>
                {isOpen && portalContainer && createPortal(PopoverContent, portalContainer)}
            </div>
        </div>
    );
};

export default ColorControl;
