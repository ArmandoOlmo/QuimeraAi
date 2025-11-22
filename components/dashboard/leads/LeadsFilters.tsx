import React, { useState } from 'react';
import { LeadStatus } from '../../../types';
import { Filter, X, ChevronDown, DollarSign, Star, Calendar, Tag } from 'lucide-react';

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

const LEAD_STATUSES: { id: LeadStatus; label: string }[] = [
    { id: 'new', label: 'New Lead' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'qualified', label: 'Qualified' },
    { id: 'negotiation', label: 'Negotiation' },
    { id: 'won', label: 'Won' },
    { id: 'lost', label: 'Lost' },
];

const SOURCES = [
    { id: 'chatbot', label: 'AI Chatbot' },
    { id: 'form', label: 'Web Form' },
    { id: 'manual', label: 'Manual Entry' },
];

const LeadsFilters: React.FC<LeadsFiltersProps> = ({ filters, onFiltersChange, availableTags }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-primary" />
                    <span className="font-bold text-sm">Advanced Filters</span>
                    {activeFiltersCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                            {activeFiltersCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearAllFilters();
                            }}
                            className="text-xs text-red-500 hover:underline"
                        >
                            Clear All
                        </button>
                    )}
                    <ChevronDown 
                        size={16} 
                        className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Filters Content */}
            {isExpanded && (
                <div className="p-4 border-t border-border space-y-4">
                    {/* Status Filter */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {LEAD_STATUSES.map(status => (
                                <button
                                    key={status.id}
                                    onClick={() => toggleStatus(status.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        filters.statuses.includes(status.id)
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-secondary/50 text-foreground hover:bg-secondary'
                                    }`}
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Source Filter */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Source
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {SOURCES.map(source => (
                                <button
                                    key={source.id}
                                    onClick={() => toggleSource(source.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        filters.sources.includes(source.id)
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-secondary/50 text-foreground hover:bg-secondary'
                                    }`}
                                >
                                    {source.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Value Range */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                            <DollarSign size={12} />
                            Deal Value Range
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <input
                                    type="number"
                                    value={filters.valueRange.min}
                                    onChange={e => updateFilter('valueRange', { ...filters.valueRange, min: Number(e.target.value) })}
                                    placeholder="Min"
                                    className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <input
                                    type="number"
                                    value={filters.valueRange.max}
                                    onChange={e => updateFilter('valueRange', { ...filters.valueRange, max: Number(e.target.value) })}
                                    placeholder="Max"
                                    className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI Score Range */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Star size={12} />
                            AI Score Range
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={filters.scoreRange.min}
                                    onChange={e => updateFilter('scoreRange', { ...filters.scoreRange, min: Number(e.target.value) })}
                                    placeholder="Min (0-100)"
                                    className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={filters.scoreRange.max}
                                    onChange={e => updateFilter('scoreRange', { ...filters.scoreRange, max: Number(e.target.value) })}
                                    placeholder="Max (0-100)"
                                    className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Calendar size={12} />
                            Created Date Range
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={e => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                                    className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={e => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                                    className="w-full bg-secondary/20 border border-border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tags Filter */}
                    {availableTags.length > 0 && (
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Tag size={12} />
                                Tags
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            filters.tags.includes(tag)
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-secondary/50 text-foreground hover:bg-secondary'
                                        }`}
                                    >
                                        {tag}
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

export default LeadsFilters;

