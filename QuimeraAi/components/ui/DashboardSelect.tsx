/**
 * DashboardSelect
 * Custom styled dropdown for dashboard views.
 * Replaces native browser <select> with a styled popup dropdown
 * that matches the dashboard UI theme (bg-secondary, border-border, etc.)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DashboardSelectOption {
    value: string;
    label: string;
}

interface DashboardSelectProps {
    /** Currently selected value */
    value: string;
    /** Called when the user selects a new value */
    onChange: (value: string) => void;
    /** Options to render */
    options: DashboardSelectOption[];
    /** Optional CSS className for the container */
    className?: string;
    /** Placeholder when no value is selected */
    placeholder?: string;
}

const DashboardSelect: React.FC<DashboardSelectProps> = ({
    value,
    onChange,
    options,
    className = '',
    placeholder,
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
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    // Auto-scroll to selected option
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => {
                const selectedEl = listRef.current?.querySelector('[data-selected="true"]');
                if (selectedEl) selectedEl.scrollIntoView({ block: 'center', behavior: 'instant' });
            });
        }
    }, [isOpen]);

    const handleSelect = useCallback((val: string) => {
        onChange(val);
        setIsOpen(false);
    }, [onChange]);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`h-10 w-full flex items-center justify-between px-3 rounded-xl border text-sm transition-all cursor-pointer ${
                    isOpen
                        ? 'border-primary/60 ring-2 ring-primary/40 bg-secondary/50 text-foreground'
                        : 'border-border/60 bg-secondary/30 text-foreground hover:border-primary/40'
                }`}
            >
                <span className="truncate">{selectedOption?.label || placeholder || value}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown List */}
            {isOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 z-[999] bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden backdrop-blur-xl">
                    <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain py-1">
                        {options.map(opt => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    data-selected={isSelected}
                                    onClick={() => handleSelect(opt.value)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                        isSelected
                                            ? 'bg-primary/15 text-primary font-medium'
                                            : 'text-foreground hover:bg-secondary/50'
                                    }`}
                                >
                                    <span className="flex-1 truncate">{opt.label}</span>
                                    {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardSelect;
