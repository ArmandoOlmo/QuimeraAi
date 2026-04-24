import React, { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Sparkles, History, ChevronDown } from 'lucide-react';
import { useSafeProject } from '../../contexts/project';

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className="w-full bg-editor-bg text-editor-text-primary p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent/50 focus:border-editor-accent focus:outline-none transition-all text-xs font-mono"
    />
);

const Label: React.FC<{ children: ReactNode, htmlFor?: string }> = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block text-[10px] font-bold text-editor-text-secondary mb-1.5 uppercase tracking-wider flex items-center gap-1">{children}</label>
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

const useClickOutside = (
    ref: React.RefObject<HTMLElement>,
    handler: () => void,
    excludeRef?: React.RefObject<HTMLElement>,
    isActive: boolean = true
) => {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!isActive) return;

        let listener: ((event: MouseEvent | TouchEvent) => void) | null = null;

        // Delay attaching listeners so the popover has time to mount
        const timeoutId = setTimeout(() => {
            listener = (event: MouseEvent | TouchEvent) => {
                if (ref.current && ref.current.contains(event.target as Node)) {
                    return;
                }
                if (excludeRef?.current && excludeRef.current.contains(event.target as Node)) {
                    return;
                }
                handlerRef.current();
            };
            document.addEventListener('mousedown', listener);
            document.addEventListener('touchstart', listener);
        }, 150);

        return () => {
            clearTimeout(timeoutId);
            if (listener) {
                document.removeEventListener('mousedown', listener);
                document.removeEventListener('touchstart', listener);
            }
        };
    }, [ref, excludeRef, isActive]);
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
    /** Visual variant: 'editor' uses editor-* classes, 'dashboard' uses standard theme classes */
    variant?: 'editor' | 'dashboard';
    /** Optional portal container to mount the popover into */
    portalContainer?: HTMLElement | null;
    /** If true, renders a minimal swatch without text or label */
    compact?: boolean;
}

// Style maps per variant
const variantStyles = {
    editor: {
        input: 'w-full bg-editor-bg text-editor-text-primary p-2 rounded-md border border-editor-border focus:ring-2 focus:ring-editor-accent/50 focus:border-editor-accent focus:outline-none transition-all text-xs font-mono',
        label: 'block text-[10px] font-bold text-editor-text-secondary mb-1.5 uppercase tracking-wider flex items-center gap-1',
        popover: 'z-[999999] bg-editor-panel-bg border border-editor-border rounded-xl shadow-2xl shadow-black/30 p-3.5 overflow-y-auto max-h-[85vh]',
        trigger: 'w-full flex items-center gap-2.5 bg-editor-bg border border-editor-border rounded-lg px-2.5 py-2 text-sm text-editor-text-primary hover:border-editor-accent/60 hover:shadow-sm transition-all group',
        swatch: 'w-7 h-7 rounded-md border border-editor-border/80 shadow-inner flex items-center justify-center overflow-hidden bg-checkered flex-shrink-0',
        hexText: 'flex-1 text-left font-mono text-xs text-editor-text-primary/80',
        chevron: 'text-editor-text-secondary group-hover:text-editor-text-primary',
        presetBtn: 'rounded border border-editor-border hover:scale-110 transition-transform',
        rgbInput: 'flex-1 bg-editor-bg text-editor-text-primary p-1.5 rounded-md border border-editor-border focus:ring-1 focus:ring-editor-accent/50 focus:border-editor-accent focus:outline-none text-xs font-mono',
        rgbLabel: 'text-[10px] text-editor-text-secondary uppercase font-bold w-4 text-center flex-shrink-0',
        sectionLabel: 'block text-[10px] font-bold text-editor-text-secondary mb-1.5 uppercase tracking-wider',
        paletteLabel: 'text-[10px] text-editor-text-secondary truncate max-w-[60px] shrink-0',
        paletteRow: 'flex items-center gap-1 p-1 rounded bg-editor-border/30 hover:bg-editor-border/50 transition-colors min-w-0',
    },
    dashboard: {
        input: 'w-full bg-background text-foreground p-2 rounded-md border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all text-xs font-mono',
        label: 'block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-1',
        popover: 'z-[999999] bg-card border border-border rounded-xl shadow-2xl shadow-black/30 p-3.5 overflow-y-auto max-h-[85vh]',
        trigger: 'w-full flex items-center gap-2.5 bg-background border border-border rounded-lg px-2.5 py-2.5 text-sm text-foreground hover:border-primary/60 hover:shadow-sm transition-all group',
        swatch: 'w-7 h-7 rounded-md border border-border/80 shadow-inner flex items-center justify-center overflow-hidden bg-checkered flex-shrink-0',
        hexText: 'flex-1 text-left font-mono text-xs text-foreground/80',
        chevron: 'text-muted-foreground group-hover:text-foreground',
        presetBtn: 'rounded border border-border hover:scale-110 transition-transform',
        rgbInput: 'flex-1 bg-background text-foreground p-1.5 rounded-md border border-border focus:ring-1 focus:ring-primary/50 focus:border-primary focus:outline-none text-xs font-mono',
        rgbLabel: 'text-[10px] text-muted-foreground uppercase font-bold w-4 text-center flex-shrink-0',
        sectionLabel: 'block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wider',
        paletteLabel: 'text-[10px] text-muted-foreground truncate max-w-[60px] shrink-0',
        paletteRow: 'flex items-center gap-1 p-1 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors min-w-0',
    },
};

const ColorControl: React.FC<ColorControlProps> = ({ label, value, onChange, paletteColors: propPaletteColors, recentPalettes, variant = 'editor', portalContainer: propPortalContainer, compact }) => {
    const styles = variantStyles[variant];
    const project = useSafeProject();
    
    // Construir un array completo de colores de la marca para que el usuario pueda reutilizarlos
    const globalColors = project?.theme?.globalColors;
    const globalColorsArray = globalColors ? [
        globalColors.primary,
        globalColors.secondary,
        globalColors.accent,
        globalColors.background,
        globalColors.surface,
        globalColors.text,
        globalColors.heading,
        globalColors.textMuted,
        globalColors.border,
    ].filter(Boolean) : [];
    
    // Si no pasan paleta, unificamos los semánticos y los originales (quitando duplicados)
    const paletteColors = propPaletteColors ?? Array.from(new Set([
        ...globalColorsArray,
        ...(project?.theme?.paletteColors || [])
    ]));
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const saturationRef = useRef<HTMLDivElement>(null);

    // State
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const portalContainer = propPortalContainer || document.getElementById('portal-root');
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
    }, triggerRef, isOpen);

    // Position the popover so it's always fully visible in the viewport
    useLayoutEffect(() => {
        if (!isOpen || !triggerRef.current) return;

        const reposition = () => {
            if (!triggerRef.current) return;
            const rect = triggerRef.current.getBoundingClientRect();
            const popoverWidth = 256; // w-64
            // Use actual popover height if available, otherwise estimate
            const popoverHeight = popoverRef.current?.offsetHeight || 500;
            const gap = 8;
            const viewportH = window.innerHeight;
            const viewportW = window.innerWidth;

            let top: number;
            let left: number;

            // Prefer below the trigger
            const spaceBelow = viewportH - rect.bottom - gap;
            const spaceAbove = rect.top - gap;

            if (spaceBelow >= popoverHeight) {
                // Fits below
                top = rect.bottom + gap;
            } else if (spaceAbove >= popoverHeight) {
                // Fits above
                top = rect.top - popoverHeight - gap;
            } else {
                // Doesn't fully fit either way — pick the side with more room and clamp
                if (spaceBelow >= spaceAbove) {
                    top = rect.bottom + gap;
                } else {
                    top = rect.top - popoverHeight - gap;
                }
            }

            // Clamp vertically so it never goes off-screen
            top = Math.max(gap, Math.min(top, viewportH - popoverHeight - gap));

            // Horizontal: try to align left edge with trigger, clamp to viewport
            left = rect.left;
            if (left + popoverWidth > viewportW - gap) left = viewportW - popoverWidth - gap;
            if (left < gap) left = gap;

            setPopoverStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
                width: '256px',
            });
        };

        // Initial position (estimate height)
        reposition();

        // Re-position once the popover is painted and we know its real height
        const raf = requestAnimationFrame(reposition);

        // Keep it in position on scroll / resize
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
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
            className={styles.popover}
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
                <label className={styles.label}>Hue</label>
                <input
                    type="range"
                    min="0"
                    max="360"
                    value={localHsv.h}
                    onChange={handleHueChange}
                    className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                    style={{
                        background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
                    }}
                />
            </div>

            {/* Alpha slider */}
            <div className="mb-3">
                <label className={styles.label}>Opacity: {Math.round(alpha * 100)}%</label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={alpha}
                    onChange={(e) => handleColorChange(formatColor({ hex, alpha: parseFloat(e.target.value) }))}
                    className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, transparent, ${hex})`
                    }}
                />
            </div>

            {/* Hex input */}
            <div className="mb-3">
                <label className={styles.label}>HEX</label>
                <input
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
                    className={styles.input}
                />
            </div>

            {/* RGB Inputs */}
            <div className="mb-3">
                <label className={styles.label}>RGB</label>
                <div className="space-y-1.5">
                    {(['r', 'g', 'b'] as const).map((k) => (
                        <div key={k} className="flex items-center gap-2" id={`color-rgb-${k}`}>
                            <span className={styles.rgbLabel}>{k}</span>
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
                                className={styles.rgbInput}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Palette colors from theme */}
            {paletteColors && paletteColors.length > 0 && (
                <div className="mb-3">
                    <label className={styles.label}><Palette size={12} className="inline mr-1" />Theme Palette</label>
                    <div className="flex flex-wrap gap-1">
                        {paletteColors.map((color, i) => (
                            <button
                                key={`palette-${i}`}
                                onClick={() => handleColorChange(color)}
                                className={styles.presetBtn}
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
                    <label className={styles.label}><History size={12} className="inline mr-1" />Recent Palettes</label>
                    <div className="space-y-1">
                        {recentPalettes.slice(0, 5).map((palette) => (
                            <div key={palette.id} className={styles.paletteRow}>
                                <span className={styles.paletteLabel} title={palette.name}>
                                    {palette.name}:
                                </span>
                                <div className="flex gap-0.5 flex-1 min-w-0">
                                    {palette.preview.slice(0, 5).map((color, idx) => (
                                        <button
                                            key={`${palette.id}-${idx}`}
                                            onClick={() => handleColorChange(color)}
                                            className={`w-5 h-5 shrink-0 ${styles.presetBtn}`}
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
                <label className={styles.label}><Sparkles size={12} className="inline mr-1" />Presets</label>
                <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((color, i) => (
                        <button
                            key={`preset-${i}`}
                            onClick={() => handleColorChange(color)}
                            className={styles.presetBtn}
                            style={{ backgroundColor: color, width: 24, height: 24, minWidth: 24, minHeight: 24, maxWidth: 24, maxHeight: 24 }}
                            title={color}
                        />
                    ))}
                </div>
            </div>

            {/* Recent colors */}
            {recentColors.length > 0 && (
                <div>
                    <label className={styles.label}><History size={12} className="inline mr-1" />Recent</label>
                    <div className="flex flex-wrap gap-1">
                        {recentColors.map((color, i) => (
                            <button
                                key={`recent-${i}`}
                                onClick={() => handleColorChange(color)}
                                className={styles.presetBtn}
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
        <div className={compact ? "" : "mb-2"}>
            {!compact && label && <label className={styles.sectionLabel}>{label}</label>}
            <div className="relative">
                {compact ? (
                    <button
                        ref={triggerRef}
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-8 h-8 rounded-full border-2 border-editor-border/80 shadow-inner flex items-center justify-center overflow-hidden bg-checkered hover:scale-105 transition-transform"
                        title={label ? `${label}: ${safeValue}` : safeValue}
                    >
                        <div className="w-full h-full" style={{ backgroundColor: safeValue }} />
                    </button>
                ) : (
                    <button
                        ref={triggerRef}
                        onClick={() => setIsOpen(!isOpen)}
                        className={styles.trigger}
                    >
                        <div className={styles.swatch}>
                            <div className="w-full h-full rounded-[3px]" style={{ backgroundColor: safeValue }} />
                        </div>
                        <span className={styles.hexText}>{safeValue.toUpperCase()}</span>
                        <ChevronDown size={14} className={`${styles.chevron} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                )}
                {isOpen && portalContainer && createPortal(PopoverContent, portalContainer)}
            </div>
        </div>
    );
};

export default ColorControl;
