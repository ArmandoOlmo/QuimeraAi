import React, { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Sparkles, History, ChevronDown } from 'lucide-react';
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
    const safeValue = value || formatColor({ hex, alpha });

    // Sincronizar hexInput con el valor actual cuando cambia externamente
    useEffect(() => {
        setHexInput(hex.toUpperCase());
    }, [hex]);

    // Load recent colors from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('quimera_recent_colors');
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
        addToRecent(newColor);
    };

    const addToRecent = (color: string) => {
        if (!color) return;
        const newRecent = [color, ...recentColors.filter(c => c !== color)].slice(0, 14);
        setRecentColors(newRecent);
        localStorage.setItem('quimera_recent_colors', JSON.stringify(newRecent));
    };

    const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setHexInput(newValue);
        // Apply valid hex colors
        if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
            handleColorChange(formatColor({ hex: newValue, alpha }));
        }
    };

    const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAlpha = parseFloat(e.target.value);
        handleColorChange(formatColor({ hex, alpha: newAlpha }));
    };

    const PopoverContent = (
        <div
            ref={popoverRef}
            style={popoverStyle}
            className="z-[9999] w-64 bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl p-3"
        >
            {/* Native color picker */}
            <div className="mb-3">
                <input
                    ref={colorInputRef}
                    type="color"
                    value={hex}
                    onChange={(e) => handleColorChange(formatColor({ hex: e.target.value, alpha }))}
                    className="w-full h-10 rounded cursor-pointer border-0"
                />
            </div>

            {/* Hex input */}
            <div className="mb-3">
                <Label>HEX</Label>
                <Input
                    type="text"
                    value={hexInput}
                    onChange={handleHexInputChange}
                    placeholder="#000000"
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
                    onChange={handleAlphaChange}
                    className="w-full h-2 bg-editor-border rounded-lg appearance-none cursor-pointer"
                />
            </div>

            {/* Palette colors from theme */}
            {paletteColors && paletteColors.length > 0 && (
                <div className="mb-3">
                    <Label><Palette size={12} className="inline mr-1" />Theme Palette</Label>
                    <div className="grid grid-cols-8 gap-1">
                        {paletteColors.map((color, i) => (
                            <button
                                key={`palette-${i}`}
                                onClick={() => handleColorChange(color)}
                                className="w-6 h-6 rounded border border-editor-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Preset colors */}
            <div className="mb-3">
                <Label><Sparkles size={12} className="inline mr-1" />Presets</Label>
                <div className="grid grid-cols-8 gap-1">
                    {PRESET_COLORS.map((color, i) => (
                        <button
                            key={`preset-${i}`}
                            onClick={() => handleColorChange(color)}
                            className="w-6 h-6 rounded border border-editor-border hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                            title={color}
                        />
                    ))}
                </div>
            </div>

            {/* Recent colors */}
            {recentColors.length > 0 && (
                <div>
                    <Label><History size={12} className="inline mr-1" />Recent</Label>
                    <div className="grid grid-cols-8 gap-1">
                        {recentColors.map((color, i) => (
                            <button
                                key={`recent-${i}`}
                                onClick={() => handleColorChange(color)}
                                className="w-6 h-6 rounded border border-editor-border hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
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
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 bg-editor-panel-bg border border-editor-border rounded-md px-2 py-1.5 text-sm text-editor-text-primary hover:border-editor-accent transition-colors"
            >
                <div
                    className="w-6 h-6 rounded border border-editor-border shadow-sm"
                    style={{ backgroundColor: safeValue }}
                />
                <span className="flex-1 text-left font-mono text-xs">{safeValue.toUpperCase()}</span>
                <ChevronDown size={14} className="text-editor-text-secondary" />
            </button>
            {isOpen && portalContainer && createPortal(PopoverContent, portalContainer)}
        </div>
    </div>
);
};

export default ColorControl;
