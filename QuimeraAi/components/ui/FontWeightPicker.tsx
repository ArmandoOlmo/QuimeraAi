/**
 * FontWeightPicker
 * Custom dropdown component for selecting font weights.
 * Replaces the native browser <select> with a styled dropdown that matches the editor UI.
 * Each option renders its label at the corresponding font-weight for a live preview.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface FontWeightOption {
    value: number;
    label: string;
}

const FONT_WEIGHT_OPTIONS: FontWeightOption[] = [
    { value: 100, label: 'Thin (100)' },
    { value: 200, label: 'Extra Light (200)' },
    { value: 300, label: 'Light (300)' },
    { value: 400, label: 'Regular (400)' },
    { value: 500, label: 'Medium (500)' },
    { value: 600, label: 'SemiBold (600)' },
    { value: 700, label: 'Bold (700)' },
    { value: 800, label: 'Extra Bold (800)' },
    { value: 900, label: 'Black (900)' },
];

interface FontWeightPickerProps {
    /** Currently selected weight value */
    value: number;
    /** Called when the user selects a new weight */
    onChange: (weight: number) => void;
    /** Optional label (omit for inline use) */
    label?: string;
}

const FontWeightPicker: React.FC<FontWeightPickerProps> = ({
    value,
    onChange,
    label,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    // Auto-scroll to selected option when opening
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => {
                const selectedEl = listRef.current?.querySelector('[data-selected="true"]');
                if (selectedEl) {
                    selectedEl.scrollIntoView({ block: 'center', behavior: 'instant' });
                }
            });
        }
    }, [isOpen]);

    const handleSelect = useCallback((weight: number) => {
        onChange(weight);
        setIsOpen(false);
    }, [onChange]);

    const selectedOption = FONT_WEIGHT_OPTIONS.find(opt => opt.value === value) || FONT_WEIGHT_OPTIONS[3]; // Default to Regular

    return (
        <div className="flex-1" ref={containerRef}>
            {label && (
                <label className="block text-xs font-bold text-editor-text-secondary mb-1 uppercase tracking-wider">
                    {label}
                </label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-editor-panel-bg border rounded-md px-3 py-1.5 text-xs text-editor-text-primary transition-all cursor-pointer ${
                    isOpen
                        ? 'border-editor-accent ring-1 ring-editor-accent'
                        : 'border-editor-border hover:border-editor-accent/50'
                }`}
            >
                <span className="truncate" style={{ fontWeight: value }}>
                    {selectedOption.label}
                </span>
                <ChevronDown className={`h-3 w-3 text-editor-text-secondary flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown List */}
            {isOpen && (
                <div className="relative z-50">
                    <div className="absolute top-1 left-0 right-0 bg-editor-panel-bg border border-editor-border rounded-lg shadow-xl overflow-hidden">
                        <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain">
                            {FONT_WEIGHT_OPTIONS.map(opt => {
                                const isSelected = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        data-selected={isSelected}
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                                            isSelected
                                                ? 'bg-editor-accent/15 text-editor-accent'
                                                : 'text-editor-text-primary hover:bg-editor-bg'
                                        }`}
                                    >
                                        <span
                                            className="flex-1 text-xs truncate"
                                            style={{ fontWeight: opt.value }}
                                        >
                                            {opt.label}
                                        </span>
                                        {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-editor-accent" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FontWeightPicker;
