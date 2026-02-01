/**
 * NavbarSearch Component
 * Buscador colapsable para el navbar - muestra una lupa que se expande al hacer click
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface NavbarSearchProps {
    onSearch: (term: string) => void;
    placeholder?: string;
    primaryColor?: string;
    textColor?: string;
    isLoading?: boolean;
}

const NavbarSearch: React.FC<NavbarSearchProps> = ({
    onSearch,
    placeholder = 'Buscar productos...',
    primaryColor = '#6366f1',
    textColor = '#ffffff',
    isLoading = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Focus input when expanded
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                if (!searchTerm) {
                    setIsExpanded(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchTerm]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsExpanded(false);
                setSearchTerm('');
            }
        };

        if (isExpanded) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isExpanded]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm.trim());
        }
    };

    const handleClear = () => {
        setSearchTerm('');
        inputRef.current?.focus();
    };

    const handleClose = () => {
        setIsExpanded(false);
        setSearchTerm('');
    };

    const toggleExpand = () => {
        if (isExpanded) {
            handleClose();
        } else {
            setIsExpanded(true);
        }
    };

    return (
        <div ref={containerRef} className="relative flex items-center">
            {/* Collapsed: Just the search icon */}
            {!isExpanded && (
                <button
                    onClick={toggleExpand}
                    className="p-2 rounded-full transition-all duration-200 hover:bg-white/10"
                    style={{ color: textColor }}
                    aria-label="Abrir búsqueda"
                >
                    <Search size={20} />
                </button>
            )}

            {/* Expanded: Search input */}
            {isExpanded && (
                <form 
                    onSubmit={handleSubmit}
                    className="flex items-center animate-in slide-in-from-right-2 duration-200"
                >
                    <div
                        className="flex items-center bg-white/10 backdrop-blur-sm rounded-full border border-white/20 overflow-hidden"
                        style={{ borderColor: `${primaryColor}50` }}
                    >
                        <div className="pl-3">
                            <Search size={18} style={{ color: textColor, opacity: 0.7 }} />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={placeholder}
                            className="w-48 md:w-64 px-3 py-2 bg-transparent text-sm focus:outline-none placeholder:opacity-60"
                            style={{ color: textColor }}
                        />
                        {isLoading ? (
                            <div className="pr-3">
                                <Loader2 
                                    size={18} 
                                    className="animate-spin"
                                    style={{ color: textColor, opacity: 0.7 }} 
                                />
                            </div>
                        ) : searchTerm ? (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="pr-3 transition-opacity hover:opacity-70"
                                style={{ color: textColor, opacity: 0.7 }}
                            >
                                <X size={18} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleClose}
                                className="pr-3 transition-opacity hover:opacity-70"
                                style={{ color: textColor, opacity: 0.7 }}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
};

export default NavbarSearch;











