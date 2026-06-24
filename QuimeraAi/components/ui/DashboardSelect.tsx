/**
 * DashboardSelect
 * Custom styled dropdown for dashboard views.
 * Replaces native browser selects with a styled popup dropdown
 * that matches the dashboard UI theme (bg-secondary, border-q-border, etc.)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils';

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
    /** Disable interactions while preserving dashboard styling */
    disabled?: boolean;
}

const DashboardSelect: React.FC<DashboardSelectProps> = ({
    value,
    onChange,
    options,
    className = '',
    placeholder,
    disabled = false,
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
        <div className={cn('relative min-w-0', className)} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => {
                    if (!disabled) setIsOpen(!isOpen);
                }}
                disabled={disabled}
                className={`flex h-10 w-full min-w-0 items-center justify-between rounded-[var(--q-radius-md)] border px-3 text-sm shadow-[var(--q-shadow-card)] transition-all duration-[var(--q-duration-fast)] ${
                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                } ${
                    isOpen
                        ? 'border-q-accent/60 ring-2 ring-q-accent/40 bg-q-surface text-q-text'
                        : 'border-q-border/60 bg-q-surface/30 text-q-text hover:border-q-accent/40'
                }`}
            >
                <span className="min-w-0 truncate">{selectedOption?.label || placeholder || value}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-q-text-muted flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown List */}
            {isOpen && (
                <div className="absolute top-full mt-1 left-0 right-0 z-[999] overflow-hidden rounded-[var(--q-radius-lg)] border border-q-border/60 bg-q-surface shadow-[var(--q-shadow-dropdown)] backdrop-blur-xl">
                    <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain py-1 quimera-ds-scrollbar">
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
                                            ? 'bg-q-accent/15 text-q-accent font-medium'
                                            : 'text-q-text hover:bg-q-surface-elevated/50'
                                    }`}
                                >
                                    <span className="flex-1 truncate">{opt.label}</span>
                                    {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-q-accent" />}
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
