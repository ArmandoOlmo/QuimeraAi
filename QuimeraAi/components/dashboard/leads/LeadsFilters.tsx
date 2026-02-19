import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LeadStatus } from '../../../types';
import {
    Filter, X, ChevronDown, DollarSign, Star, Calendar, Tag,
    CircleDot, Zap, RotateCcw
} from 'lucide-react';

export interface LeadsFiltersState {
    search: string;
    statuses: LeadStatus[];
    sources: string[];
    valueRange: { min: number; max: number };
    scoreRange: { min: number; max: number };
    tags: string[];
    dateRange: { start: string; end: string };
}

interface LeadsFiltersProps {
    filters: LeadsFiltersState;
    onFiltersChange: (filters: LeadsFiltersState) => void;
    availableTags: string[];
}

const LEAD_STATUSES: { id: LeadStatus; label: string; color: string }[] = [
    { id: 'new', label: 'Nuevo', color: 'bg-blue-500' },
    { id: 'contacted', label: 'Contactado', color: 'bg-yellow-500' },
    { id: 'qualified', label: 'Calificado', color: 'bg-purple-500' },
    { id: 'negotiation', label: 'Negociación', color: 'bg-orange-500' },
    { id: 'won', label: 'Ganado', color: 'bg-green-500' },
    { id: 'lost', label: 'Perdido', color: 'bg-red-500' },
];

const SOURCES = [
    { id: 'chatbot', label: 'AI Chatbot', icon: Zap },
    { id: 'form', label: 'Formulario', icon: CircleDot },
    { id: 'manual', label: 'Manual', icon: CircleDot },
];

// Dropdown component reutilizable
const FilterDropdown: React.FC<{
    trigger: React.ReactNode;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    align?: 'left' | 'right';
}> = ({ trigger, children, isOpen, onToggle, align = 'left' }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                if (isOpen) onToggle();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onToggle]);

    return (
        <div ref={ref} className="relative">
            <div onClick={onToggle}>{trigger}</div>
            {isOpen && (
                <div
                    className={`absolute top-full mt-1.5 z-50 min-w-[200px] bg-popover border border-border rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 ${align === 'right' ? 'right-0' : 'left-0'
                        }`}
                >
                    {children}
                </div>
            )}
        </div>
    );
};

// Botón de filtro compacto
// Mobile: icon-only, clean (no borders, no bg). Desktop: full label + border.
const FilterButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    count?: number;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, count, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            relative inline-flex items-center gap-1.5 rounded-lg text-xs font-medium
            transition-all duration-150 whitespace-nowrap
            /* Mobile: icon-only, no border */
            h-8 w-8 justify-center border-0 bg-transparent
            sm:w-auto sm:h-auto sm:justify-start sm:px-2.5 sm:py-1.5 sm:border
            ${isActive
                ? 'text-primary sm:bg-primary sm:text-primary-foreground sm:border-primary sm:shadow-sm'
                : 'text-muted-foreground hover:text-foreground sm:bg-secondary/50 sm:text-foreground sm:border-border sm:hover:bg-secondary sm:hover:border-primary/30'
            }
        `}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {count !== undefined && count > 0 && (
            <span className={`
                hidden sm:inline ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${isActive ? 'bg-primary-foreground/20' : 'bg-primary/20 text-primary'}
            `}>
                {count}
            </span>
        )}
        {/* Mobile: show dot indicator when active */}
        {isActive && count !== undefined && count > 0 && (
            <span className="sm:hidden absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
        )}
        <ChevronDown size={12} className="ml-0.5 opacity-60 hidden sm:block" />
    </button>
);

// Chip para filtros activos
const ActiveFilterChip: React.FC<{
    label: string;
    onRemove: () => void;
}> = ({ label, onRemove }) => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full">
        {label}
        <button
            onClick={onRemove}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
        >
            <X size={10} />
        </button>
    </span>
);

const LeadsFilters: React.FC<LeadsFiltersProps> = ({ filters, onFiltersChange, availableTags }) => {
    const { t } = useTranslation();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const updateFilter = (key: keyof LeadsFiltersState, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const toggleStatus = (status: LeadStatus) => {
        const newStatuses = filters.statuses.includes(status)
            ? filters.statuses.filter(s => s !== status)
            : [...filters.statuses, status];
        updateFilter('statuses', newStatuses);
    };

    const toggleSource = (source: string) => {
        const newSources = filters.sources.includes(source)
            ? filters.sources.filter(s => s !== source)
            : [...filters.sources, source];
        updateFilter('sources', newSources);
    };

    const toggleTag = (tag: string) => {
        const newTags = filters.tags.includes(tag)
            ? filters.tags.filter(t => t !== tag)
            : [...filters.tags, tag];
        updateFilter('tags', newTags);
    };

    const clearAllFilters = () => {
        onFiltersChange({
            search: '',
            statuses: [],
            sources: [],
            valueRange: { min: 0, max: 1000000 },
            scoreRange: { min: 0, max: 100 },
            tags: [],
            dateRange: { start: '', end: '' }
        });
    };

    const activeFiltersCount =
        filters.statuses.length +
        filters.sources.length +
        filters.tags.length +
        (filters.valueRange.min > 0 || filters.valueRange.max < 1000000 ? 1 : 0) +
        (filters.scoreRange.min > 0 || filters.scoreRange.max < 100 ? 1 : 0) +
        (filters.dateRange.start || filters.dateRange.end ? 1 : 0);

    const toggleDropdown = (name: string) => {
        setOpenDropdown(openDropdown === name ? null : name);
    };

    // Mobile: toggle to show/hide advanced filters
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    return (
        <div className="space-y-2">
            {/* Mobile: square icon-only toggle for filters — no text, no border */}
            <div className="sm:hidden">
                <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className={`relative h-8 w-8 flex items-center justify-center rounded-md transition-colors ${showMobileFilters || activeFiltersCount > 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Filter size={16} />
                    {activeFiltersCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold bg-primary text-primary-foreground flex items-center justify-center">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Toolbar de filtros — always visible on desktop, collapsible on mobile */}
            <div className={`${showMobileFilters ? 'flex' : 'hidden'} sm:flex items-center gap-1 sm:gap-2 flex-wrap`}>
                {/* Icono de filtros — desktop only */}
                <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground pr-2 border-r border-border">
                    <Filter size={14} />
                    <span className="text-xs font-medium">{t('leads.filters.advancedFilters')}</span>
                </div>

                {/* Status Filter */}
                <FilterDropdown
                    isOpen={openDropdown === 'status'}
                    onToggle={() => toggleDropdown('status')}
                    trigger={
                        <FilterButton
                            icon={<CircleDot size={12} />}
                            label={t('leads.status')}
                            count={filters.statuses.length}
                            isActive={filters.statuses.length > 0}
                            onClick={() => { }}
                        />
                    }
                >
                    <div className="p-2 space-y-1">
                        {LEAD_STATUSES.map(status => (
                            <button
                                key={status.id}
                                onClick={() => toggleStatus(status.id)}
                                className={`
                                    w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs
                                    transition-colors text-left
                                    ${filters.statuses.includes(status.id)
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-secondary text-foreground'
                                    }
                                `}
                            >
                                <span className={`w-2 h-2 rounded-full ${status.color}`} />
                                <span className="flex-1">{status.label}</span>
                                {filters.statuses.includes(status.id) && (
                                    <span className="text-primary">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </FilterDropdown>

                {/* Source Filter */}
                <FilterDropdown
                    isOpen={openDropdown === 'source'}
                    onToggle={() => toggleDropdown('source')}
                    trigger={
                        <FilterButton
                            icon={<Zap size={12} />}
                            label={t('leads.source')}
                            count={filters.sources.length}
                            isActive={filters.sources.length > 0}
                            onClick={() => { }}
                        />
                    }
                >
                    <div className="p-2 space-y-1">
                        {SOURCES.map(source => {
                            const Icon = source.icon;
                            return (
                                <button
                                    key={source.id}
                                    onClick={() => toggleSource(source.id)}
                                    className={`
                                        w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs
                                        transition-colors text-left
                                        ${filters.sources.includes(source.id)
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-secondary text-foreground'
                                        }
                                    `}
                                >
                                    <Icon size={12} />
                                    <span className="flex-1">{source.label}</span>
                                    {filters.sources.includes(source.id) && (
                                        <span className="text-primary">✓</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </FilterDropdown>

                {/* Value Range */}
                <FilterDropdown
                    isOpen={openDropdown === 'value'}
                    onToggle={() => toggleDropdown('value')}
                    trigger={
                        <FilterButton
                            icon={<DollarSign size={12} />}
                            label={t('leads.filters.dealValueRange')}
                            count={filters.valueRange.min > 0 || filters.valueRange.max < 1000000 ? 1 : 0}
                            isActive={filters.valueRange.min > 0 || filters.valueRange.max < 1000000}
                            onClick={() => { }}
                        />
                    }
                >
                    <div className="p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Min</label>
                                <input
                                    type="number"
                                    value={filters.valueRange.min}
                                    onChange={e => updateFilter('valueRange', { ...filters.valueRange, min: Number(e.target.value) })}
                                    className="w-full bg-secondary/30 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Max</label>
                                <input
                                    type="number"
                                    value={filters.valueRange.max}
                                    onChange={e => updateFilter('valueRange', { ...filters.valueRange, max: Number(e.target.value) })}
                                    className="w-full bg-secondary/30 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </div>
                </FilterDropdown>

                {/* AI Score */}
                <FilterDropdown
                    isOpen={openDropdown === 'score'}
                    onToggle={() => toggleDropdown('score')}
                    trigger={
                        <FilterButton
                            icon={<Star size={12} />}
                            label={t('leads.filters.aiScoreRange')}
                            count={filters.scoreRange.min > 0 || filters.scoreRange.max < 100 ? 1 : 0}
                            isActive={filters.scoreRange.min > 0 || filters.scoreRange.max < 100}
                            onClick={() => { }}
                        />
                    }
                >
                    <div className="p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Min (0-100)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={filters.scoreRange.min}
                                    onChange={e => updateFilter('scoreRange', { ...filters.scoreRange, min: Number(e.target.value) })}
                                    className="w-full bg-secondary/30 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Max (0-100)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={filters.scoreRange.max}
                                    onChange={e => updateFilter('scoreRange', { ...filters.scoreRange, max: Number(e.target.value) })}
                                    className="w-full bg-secondary/30 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </div>
                </FilterDropdown>

                {/* Date Range */}
                <FilterDropdown
                    isOpen={openDropdown === 'date'}
                    onToggle={() => toggleDropdown('date')}
                    align="right"
                    trigger={
                        <FilterButton
                            icon={<Calendar size={12} />}
                            label={t('leads.filters.createdDateRange')}
                            count={filters.dateRange.start || filters.dateRange.end ? 1 : 0}
                            isActive={!!(filters.dateRange.start || filters.dateRange.end)}
                            onClick={() => { }}
                        />
                    }
                >
                    <div className="p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Desde</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={e => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                                    className="w-full bg-secondary/30 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase mb-1 block">Hasta</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={e => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                                    className="w-full bg-secondary/30 border border-border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </div>
                </FilterDropdown>

                {/* Tags Filter */}
                {availableTags.length > 0 && (
                    <FilterDropdown
                        isOpen={openDropdown === 'tags'}
                        onToggle={() => toggleDropdown('tags')}
                        align="right"
                        trigger={
                            <FilterButton
                                icon={<Tag size={12} />}
                                label={t('leads.tags')}
                                count={filters.tags.length}
                                isActive={filters.tags.length > 0}
                                onClick={() => { }}
                            />
                        }
                    >
                        <div className="p-2 max-h-48 overflow-y-auto space-y-1">
                            {availableTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`
                                        w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs
                                        transition-colors text-left
                                        ${filters.tags.includes(tag)
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-secondary text-foreground'
                                        }
                                    `}
                                >
                                    <Tag size={10} />
                                    <span className="flex-1">{tag}</span>
                                    {filters.tags.includes(tag) && (
                                        <span className="text-primary">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </FilterDropdown>
                )}

                {/* Clear All Button */}
                {activeFiltersCount > 0 && (
                    <button
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <RotateCcw size={12} />
                        <span>{t('leads.filters.clearAll')}</span>
                    </button>
                )}
            </div>

            {/* Active Filters Display - Solo si hay filtros activos */}
            {activeFiltersCount > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap py-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Activos:</span>

                    {/* Status chips */}
                    {filters.statuses.map(status => {
                        const statusInfo = LEAD_STATUSES.find(s => s.id === status);
                        return (
                            <ActiveFilterChip
                                key={status}
                                label={statusInfo?.label || status}
                                onRemove={() => toggleStatus(status)}
                            />
                        );
                    })}

                    {/* Source chips */}
                    {filters.sources.map(source => {
                        const sourceInfo = SOURCES.find(s => s.id === source);
                        return (
                            <ActiveFilterChip
                                key={source}
                                label={sourceInfo?.label || source}
                                onRemove={() => toggleSource(source)}
                            />
                        );
                    })}

                    {/* Tag chips */}
                    {filters.tags.map(tag => (
                        <ActiveFilterChip
                            key={tag}
                            label={tag}
                            onRemove={() => toggleTag(tag)}
                        />
                    ))}

                    {/* Value range chip */}
                    {(filters.valueRange.min > 0 || filters.valueRange.max < 1000000) && (
                        <ActiveFilterChip
                            label={`$${filters.valueRange.min.toLocaleString()} - $${filters.valueRange.max.toLocaleString()}`}
                            onRemove={() => updateFilter('valueRange', { min: 0, max: 1000000 })}
                        />
                    )}

                    {/* Score range chip */}
                    {(filters.scoreRange.min > 0 || filters.scoreRange.max < 100) && (
                        <ActiveFilterChip
                            label={`Score: ${filters.scoreRange.min}-${filters.scoreRange.max}`}
                            onRemove={() => updateFilter('scoreRange', { min: 0, max: 100 })}
                        />
                    )}

                    {/* Date range chip */}
                    {(filters.dateRange.start || filters.dateRange.end) && (
                        <ActiveFilterChip
                            label={`${filters.dateRange.start || '...'} → ${filters.dateRange.end || '...'}`}
                            onRemove={() => updateFilter('dateRange', { start: '', end: '' })}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default LeadsFilters;
