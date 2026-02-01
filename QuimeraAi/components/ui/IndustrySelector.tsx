import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Check, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { INDUSTRIES, INDUSTRY_CATEGORIES, Industry } from '../../data/industries';

interface IndustrySelectorProps {
    selectedIndustries: string[];
    onChange: (industries: string[]) => void;
    maxHeight?: string;
    className?: string;
}

const IndustrySelector: React.FC<IndustrySelectorProps> = ({
    selectedIndustries,
    onChange,
    maxHeight = '350px',
    className = ''
}) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Update dropdown position
    const updatePosition = useCallback(() => {
        if (!triggerRef.current || !isDropdownOpen) return;
        
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const dropdownHeight = 400;
        
        // Calculate if should open upward
        const spaceBelow = viewportHeight - rect.bottom - 16;
        const spaceAbove = rect.top - 16;
        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        
        // Calculate width (match trigger or minimum 320px)
        const width = Math.max(rect.width, 320);
        
        // Calculate left position (ensure it doesn't go off screen)
        let left = rect.left;
        if (left + width > viewportWidth - 16) {
            left = viewportWidth - width - 16;
        }
        if (left < 16) left = 16;
        
        const style: React.CSSProperties = {
            position: 'fixed',
            width: width,
            left: left,
            zIndex: 999999,
        };
        
        if (openUpward) {
            style.bottom = viewportHeight - rect.top + 8;
        } else {
            style.top = rect.bottom + 8;
        }
        
        setDropdownStyle(style);
    }, [isDropdownOpen]);

    // Update position on open and resize
    useEffect(() => {
        if (isDropdownOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isDropdownOpen, updatePosition]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isClickOnTrigger = triggerRef.current?.contains(target);
            const isClickOnDropdown = dropdownRef.current?.contains(target);
            
            if (!isClickOnTrigger && !isClickOnDropdown) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            // Use setTimeout to avoid immediate close on same click
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    // Get industry label from translation
    const getIndustryLabel = (industry: Industry): string => {
        const key = industry.labelKey.replace('industries.', '');
        return t(`industries.${key}`, { defaultValue: industry.id });
    };

    // Filter industries based on search
    const filteredIndustries = useMemo(() => {
        if (!searchTerm) return INDUSTRIES;
        const search = searchTerm.toLowerCase();
        return INDUSTRIES.filter(industry => {
            const label = getIndustryLabel(industry).toLowerCase();
            return label.includes(search) || industry.id.includes(search);
        });
    }, [searchTerm, t]);

    // Group filtered industries by category
    const groupedIndustries = useMemo(() => {
        const groups: Record<string, Industry[]> = {};
        
        Object.entries(INDUSTRY_CATEGORIES).forEach(([categoryKey, industryIds]) => {
            const categoryIndustries = filteredIndustries.filter(ind => industryIds.includes(ind.id));
            if (categoryIndustries.length > 0) {
                groups[categoryKey] = categoryIndustries;
            }
        });
        
        return groups;
    }, [filteredIndustries]);

    const toggleIndustry = (industryId: string) => {
        if (selectedIndustries.includes(industryId)) {
            onChange(selectedIndustries.filter(id => id !== industryId));
        } else {
            onChange([...selectedIndustries, industryId]);
        }
    };

    const toggleCategory = (categoryKey: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(categoryKey)) {
                next.delete(categoryKey);
            } else {
                next.add(categoryKey);
            }
            return next;
        });
    };

    const selectAllInCategory = (categoryKey: string) => {
        const categoryIds = INDUSTRY_CATEGORIES[categoryKey as keyof typeof INDUSTRY_CATEGORIES] || [];
        const allSelected = categoryIds.every(id => selectedIndustries.includes(id));
        
        if (allSelected) {
            onChange(selectedIndustries.filter(id => !categoryIds.includes(id)));
        } else {
            const newSelection = [...new Set([...selectedIndustries, ...categoryIds])];
            onChange(newSelection);
        }
    };

    const clearAll = () => onChange([]);
    const selectAll = () => onChange(INDUSTRIES.map(i => i.id));

    const getCategoryLabel = (categoryKey: string): string => {
        return t(`industries.categories.${categoryKey}`, { defaultValue: categoryKey });
    };

    const isCategoryFullySelected = (categoryKey: string): boolean => {
        const categoryIds = INDUSTRY_CATEGORIES[categoryKey as keyof typeof INDUSTRY_CATEGORIES] || [];
        return categoryIds.length > 0 && categoryIds.every(id => selectedIndustries.includes(id));
    };

    const isCategoryPartiallySelected = (categoryKey: string): boolean => {
        const categoryIds = INDUSTRY_CATEGORIES[categoryKey as keyof typeof INDUSTRY_CATEGORIES] || [];
        const selectedCount = categoryIds.filter(id => selectedIndustries.includes(id)).length;
        return selectedCount > 0 && selectedCount < categoryIds.length;
    };

    const selectedLabels = useMemo(() => {
        return selectedIndustries.map(id => {
            const industry = INDUSTRIES.find(i => i.id === id);
            return industry ? getIndustryLabel(industry) : id;
        });
    }, [selectedIndustries, t]);

    // Dropdown content
    const dropdownContent = isDropdownOpen ? (
        <div 
            ref={dropdownRef}
            className="bg-editor-panel-bg border border-editor-border rounded-lg shadow-2xl"
            style={dropdownStyle}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Search and Actions */}
            <div className="p-3 border-b border-editor-border space-y-2">
                <div className="flex items-center gap-2 bg-editor-border/40 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('industries.searchPlaceholder')}
                        className="flex-1 bg-transparent outline-none text-sm min-w-0"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSearchTerm(''); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-editor-text-secondary hover:text-editor-text-primary"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); selectAll(); }}
                        className="text-xs text-editor-accent hover:underline"
                    >
                        {t('industries.selectAll')}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); clearAll(); }}
                        className="text-xs text-editor-text-secondary hover:text-red-400"
                    >
                        {t('industries.clearAll')}
                    </button>
                </div>
            </div>

            {/* Categories List */}
            <div 
                className="overflow-y-auto"
                style={{ maxHeight }}
            >
                {Object.entries(groupedIndustries).map(([categoryKey, industries]) => (
                    <div key={categoryKey} className="border-b border-editor-border last:border-b-0">
                        {/* Category Header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-editor-bg/50 sticky top-0 z-10">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleCategory(categoryKey); }}
                                className="flex items-center gap-2 flex-1 text-left"
                            >
                                {expandedCategories.has(categoryKey) || searchTerm ? (
                                    <ChevronDown className="w-4 h-4 text-editor-text-secondary" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-editor-text-secondary" />
                                )}
                                <span className="text-sm font-medium text-editor-text-primary">
                                    {getCategoryLabel(categoryKey)}
                                </span>
                                <span className="text-xs text-editor-text-secondary">
                                    ({industries.length})
                                </span>
                            </button>
                            
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); selectAllInCategory(categoryKey); }}
                                className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                    isCategoryFullySelected(categoryKey)
                                        ? 'bg-editor-accent border-editor-accent'
                                        : isCategoryPartiallySelected(categoryKey)
                                        ? 'bg-editor-accent/50 border-editor-accent'
                                        : 'border-editor-border hover:border-editor-accent'
                                }`}
                            >
                                {(isCategoryFullySelected(categoryKey) || isCategoryPartiallySelected(categoryKey)) && (
                                    <Check className="w-3 h-3 text-white" />
                                )}
                            </button>
                        </div>

                        {/* Category Industries */}
                        {(expandedCategories.has(categoryKey) || searchTerm) && (
                            <div className="py-1">
                                {industries.map(industry => (
                                    <button
                                        key={industry.id}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleIndustry(industry.id); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-editor-border/40 transition-colors"
                                    >
                                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                            selectedIndustries.includes(industry.id)
                                                ? 'bg-editor-accent border-editor-accent'
                                                : 'border-editor-border'
                                        }`}>
                                            {selectedIndustries.includes(industry.id) && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <span className="text-sm text-editor-text-primary text-left">
                                            {getIndustryLabel(industry)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {Object.keys(groupedIndustries).length === 0 && (
                    <div className="p-4 text-center text-editor-text-secondary text-sm">
                        No industries found
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return (
        <div className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-editor-bg border border-editor-border rounded-lg text-left hover:border-editor-accent transition-colors"
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 className="w-4 h-4 text-editor-text-secondary flex-shrink-0" />
                    {selectedIndustries.length === 0 ? (
                        <span className="text-editor-text-secondary text-sm">
                            {t('industries.selectIndustries')}
                        </span>
                    ) : (
                        <span className="text-sm text-editor-text-primary truncate">
                            {t('industries.selectedCount', { count: selectedIndustries.length })}
                        </span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-editor-text-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Selected Tags */}
            {selectedIndustries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedLabels.slice(0, 5).map((label, idx) => (
                        <span
                            key={selectedIndustries[idx]}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-editor-accent/20 text-editor-accent text-xs rounded-full"
                        >
                            {label}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleIndustry(selectedIndustries[idx]);
                                }}
                                className="hover:text-editor-accent/70"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    {selectedIndustries.length > 5 && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-editor-border text-editor-text-secondary text-xs rounded-full">
                            +{selectedIndustries.length - 5}
                        </span>
                    )}
                </div>
            )}

            {/* Dropdown Portal */}
            {isDropdownOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default IndustrySelector;
