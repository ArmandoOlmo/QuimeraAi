/**
 * SearchBar Component
 * Barra de búsqueda de productos con autocompletado
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, Clock, TrendingUp } from 'lucide-react';
import { escapeHtml } from '../../../utils/sanitize';

interface ThemeColors {
    background?: string;
    text?: string;
    border?: string;
    mutedText?: string;
    inputBackground?: string;
}

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onSearch: (term: string) => void;
    placeholder?: string;
    suggestions?: string[];
    recentSearches?: string[];
    isLoading?: boolean;
    primaryColor?: string;
    /** Theme colors from the parent site for consistent styling */
    themeColors?: ThemeColors;
}

const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChange,
    onSearch,
    placeholder = 'Buscar productos...',
    suggestions = [],
    recentSearches = [],
    isLoading = false,
    primaryColor = '#6366f1',
    themeColors,
}) => {
    // Theme colors with fallbacks
    const colors = {
        background: themeColors?.background,
        text: themeColors?.text,
        border: themeColors?.border,
        mutedText: themeColors?.mutedText,
        inputBackground: themeColors?.inputBackground || themeColors?.background,
    };
    const hasThemeColors = Boolean(themeColors);
    const [isFocused, setIsFocused] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Local storage for recent searches
    const RECENT_SEARCHES_KEY = 'quimera_recent_searches';

    const [localRecentSearches, setLocalRecentSearches] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const saveRecentSearch = (term: string) => {
        const trimmed = term.trim();
        if (!trimmed) return;

        const updated = [trimmed, ...localRecentSearches.filter((s) => s !== trimmed)].slice(0, 5);
        setLocalRecentSearches(updated);
        try {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch {
            // Ignore storage errors
        }
    };

    const clearRecentSearches = () => {
        setLocalRecentSearches([]);
        try {
            localStorage.removeItem(RECENT_SEARCHES_KEY);
        } catch {
            // Ignore storage errors
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            saveRecentSearch(value);
            onSearch(value);
            setShowDropdown(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        onChange(suggestion);
        saveRecentSearch(suggestion);
        onSearch(suggestion);
        setShowDropdown(false);
    };

    const handleClear = () => {
        onChange('');
        onSearch('');
        inputRef.current?.focus();
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displaySuggestions = value ? suggestions : [];
    const displayRecent = !value ? (recentSearches.length > 0 ? recentSearches : localRecentSearches) : [];
    const hasDropdownContent = displaySuggestions.length > 0 || displayRecent.length > 0;

    return (
        <div className="relative">
            <form onSubmit={handleSubmit}>
                <div
                    className={`relative flex items-center border-2 rounded-xl transition-all ${
                        isFocused
                            ? 'shadow-lg'
                            : hasThemeColors 
                                ? ''
                                : 'border-gray-200 dark:border-gray-700'
                    } ${hasThemeColors ? '' : 'bg-white dark:bg-gray-800'}`}
                    style={{
                        ...(isFocused ? { borderColor: primaryColor } : colors?.border ? { borderColor: colors?.border } : {}),
                        ...(hasThemeColors ? { backgroundColor: colors?.inputBackground } : {}),
                    }}
                >
                    <Search
                        className={hasThemeColors ? "absolute left-4" : "absolute left-4 text-gray-400"}
                        size={20}
                        style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={() => {
                            setIsFocused(true);
                            setShowDropdown(true);
                        }}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        className={hasThemeColors 
                            ? "w-full pl-12 pr-12 py-3 bg-transparent focus:outline-none"
                            : "w-full pl-12 pr-12 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                        }
                        style={hasThemeColors ? { color: colors?.text } : undefined}
                    />
                    {isLoading ? (
                        <Loader2
                            className={hasThemeColors ? "absolute right-4 animate-spin" : "absolute right-4 animate-spin text-gray-400"}
                            size={20}
                            style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                        />
                    ) : value ? (
                        <button
                            type="button"
                            onClick={handleClear}
                            className={hasThemeColors ? "absolute right-4 p-1 transition-colors hover:opacity-70" : "absolute right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"}
                            style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                        >
                            <X size={18} />
                        </button>
                    ) : null}
                </div>
            </form>

            {/* Dropdown */}
            {showDropdown && hasDropdownContent && (
                <div
                    ref={dropdownRef}
                    className={hasThemeColors 
                        ? "absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl border overflow-hidden z-50"
                        : "absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                    }
                    style={hasThemeColors ? {
                        backgroundColor: colors?.background,
                        borderColor: colors?.border,
                    } : undefined}
                >
                    {/* Recent Searches */}
                    {displayRecent.length > 0 && (
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span 
                                    className={hasThemeColors ? "text-xs font-medium flex items-center gap-1" : "text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"}
                                    style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                                >
                                    <Clock size={12} />
                                    Búsquedas recientes
                                </span>
                                <button
                                    onClick={clearRecentSearches}
                                    className={hasThemeColors ? "text-xs hover:opacity-70" : "text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}
                                    style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                                >
                                    Limpiar
                                </button>
                            </div>
                            <div className="space-y-1">
                                {displayRecent.map((term, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(term)}
                                        className={hasThemeColors 
                                            ? "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
                                            : "w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        }
                                        style={colors?.text ? { color: colors?.text } : undefined}
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    {displaySuggestions.length > 0 && (
                        <div 
                            className={hasThemeColors ? "p-3 border-t" : "p-3 border-t border-gray-200 dark:border-gray-700"}
                            style={colors?.border ? { borderColor: colors?.border } : undefined}
                        >
                            <span 
                                className={hasThemeColors ? "text-xs font-medium flex items-center gap-1 mb-2" : "text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2"}
                                style={colors?.mutedText ? { color: colors?.mutedText } : undefined}
                            >
                                <TrendingUp size={12} />
                                Sugerencias
                            </span>
                            <div className="space-y-1">
                                {displaySuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className={hasThemeColors 
                                            ? "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
                                            : "w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        }
                                        style={colors?.text ? { color: colors?.text } : undefined}
                                    >
                                        <span
                                            dangerouslySetInnerHTML={{
                                                // SECURITY: Escape both suggestion and search value to prevent XSS
                                                __html: escapeHtml(suggestion).replace(
                                                    new RegExp(`(${escapeHtml(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                                                    `<strong style="color: ${primaryColor}">$1</strong>`
                                                ),
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
