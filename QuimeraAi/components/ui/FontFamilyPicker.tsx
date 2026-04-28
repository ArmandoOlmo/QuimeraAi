/**
 * FontFamilyPicker
 * Reusable dropdown component that shows each font rendered in its actual Google Font typeface.
 * Used across the Web Editor, Agency Landing Editor, App Landing Editor, and Email Editor.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { fontOptions, fontStacks, formatFontName, loadAllFonts } from '../../utils/fontLoader';
import { FontFamily } from '../../types';

interface FontFamilyPickerProps {
    /** Label text shown above the picker */
    label: string;
    /** Currently selected font key (e.g. 'inter', 'poppins') */
    value: FontFamily;
    /** Called when the user selects a new font */
    onChange: (font: FontFamily) => void;
    /** Whether to show the live font preview box below the picker (default: true) */
    showPreview?: boolean;
}

const FontFamilyPicker: React.FC<FontFamilyPickerProps> = ({
    label,
    value,
    onChange,
    showPreview = true,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Preload ALL Google Fonts for dropdown preview
    useEffect(() => {
        loadAllFonts();
    }, []);

    // Filter fonts by search query
    const filteredFonts = fontOptions.filter(font =>
        formatFontName(font).toLowerCase().includes(search.toLowerCase())
    );

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
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
                setSearch('');
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    // Auto-scroll to selected font and focus search when opening
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => searchRef.current?.focus());
            requestAnimationFrame(() => {
                const selectedEl = listRef.current?.querySelector('[data-selected="true"]');
                if (selectedEl) {
                    selectedEl.scrollIntoView({ block: 'center', behavior: 'instant' });
                }
            });
        }
    }, [isOpen]);

    const handleSelect = useCallback((font: FontFamily) => {
        onChange(font);
        setIsOpen(false);
        setSearch('');
    }, [onChange]);

    const selectedStack = fontStacks[value] || "'Inter', sans-serif";

    return (
        <div className="mb-3" ref={containerRef}>
            <label className="block text-xs font-bold text-q-text-secondary mb-1 uppercase tracking-wider">
                {label}
            </label>

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-q-surface border rounded-md px-3 py-2.5 text-base text-q-text transition-all cursor-pointer ${
                    isOpen
                        ? 'border-q-accent ring-1 ring-q-accent'
                        : 'border-q-border hover:border-q-accent/50'
                }`}
                style={{ fontFamily: selectedStack }}
            >
                <span className="truncate">{formatFontName(value)}</span>
                <ChevronDown className={`h-4 w-4 text-q-text-secondary flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown List */}
            {isOpen && (
                <div className="relative z-50">
                    <div className="absolute top-1 left-0 right-0 bg-q-surface border border-q-border rounded-lg shadow-xl overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-q-border">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 text-q-text-secondary" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar fuente..."
                                    className="w-full bg-q-bg border border-q-border rounded-md pl-10 pr-3 py-2.5 text-base text-q-text placeholder:text-q-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-q-accent"
                                />
                            </div>
                        </div>

                        {/* Font Options List */}
                        <div ref={listRef} className="max-h-64 overflow-y-auto overscroll-contain">
                            {filteredFonts.length === 0 ? (
                                <div className="px-3 py-4 text-sm text-q-text-secondary text-center">
                                    No se encontraron fuentes
                                </div>
                            ) : (
                                filteredFonts.map(font => {
                                    const isSelected = font === value;
                                    return (
                                        <button
                                            key={font}
                                            type="button"
                                            data-selected={isSelected}
                                            onClick={() => handleSelect(font)}
                                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                                                isSelected
                                                    ? 'bg-q-accent/15 text-q-accent'
                                                    : 'text-q-text hover:bg-q-bg'
                                            }`}
                                            style={{ fontFamily: fontStacks[font] }}
                                        >
                                            <span className="flex-1 text-base truncate">
                                                {formatFontName(font)}
                                            </span>
                                            {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-q-accent" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Live Preview */}
            {showPreview && (
                <div
                    className="mt-2 p-3 bg-q-bg rounded-lg border border-q-border"
                    style={{ fontFamily: selectedStack }}
                >
                    <p className="text-base text-q-text font-semibold">
                        {formatFontName(value)}
                    </p>
                    <p className="text-sm text-q-text-secondary mt-1">
                        The quick brown fox jumps over the lazy dog
                    </p>
                </div>
            )}
        </div>
    );
};

export default FontFamilyPicker;
