import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'grid' | 'list';
export type DashboardSortField = 'lastUpdated' | 'name';
export type ProjectSortField = 'recent' | 'name';
export type SortDirection = 'asc' | 'desc';

interface ViewModeToggleProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    className?: string;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
    viewMode,
    onViewModeChange,
    className = '',
}) => {
    const { t } = useTranslation();

    return (
        <div
            className={`hidden sm:flex items-center gap-1 bg-secondary/40 rounded-lg p-1 ${className}`}
            role="group"
            aria-label="View mode"
        >
            <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${
                    viewMode === 'grid'
                        ? 'text-primary bg-q-bg'
                        : 'text-q-text-muted hover:text-foreground'
                }`}
                aria-label={t('dashboard.gridView', 'Vista cuadrícula')}
                aria-pressed={viewMode === 'grid'}
            >
                <LayoutGrid size={15} aria-hidden="true" />
            </button>
            <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${
                    viewMode === 'list'
                        ? 'text-primary bg-q-bg'
                        : 'text-q-text-muted hover:text-foreground'
                }`}
                aria-label={t('dashboard.listView', 'Vista lista')}
                aria-pressed={viewMode === 'list'}
            >
                <List size={15} aria-hidden="true" />
            </button>
        </div>
    );
};

interface CycleSortButtonProps {
    sortBy: DashboardSortField;
    sortOrder: SortDirection;
    onSortByChange: (field: DashboardSortField) => void;
    onSortOrderChange: (order: SortDirection) => void;
    className?: string;
}

export const CycleSortButton: React.FC<CycleSortButtonProps> = ({
    sortBy,
    sortOrder,
    onSortByChange,
    onSortOrderChange,
    className = '',
}) => {
    const { t } = useTranslation();

    const handleClick = () => {
        if (sortBy === 'lastUpdated') {
            onSortByChange('name');
            onSortOrderChange('asc');
        } else if (sortBy === 'name' && sortOrder === 'asc') {
            onSortOrderChange('desc');
        } else {
            onSortByChange('lastUpdated');
            onSortOrderChange('desc');
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all bg-secondary/50 text-q-text-muted hover:text-foreground hover:bg-secondary ${className}`}
            aria-label={`Sort by ${sortBy} (${sortOrder}ending)`}
        >
            <ArrowUpDown size={14} aria-hidden="true" />
            <span className="hidden md:inline">
                {sortBy === 'name' ? t('common.name', 'Nombre') : t('common.updated', 'Actualizado')}
            </span>
        </button>
    );
};

interface SelectSortControlProps {
    sortBy: ProjectSortField;
    onSortByChange: (field: ProjectSortField) => void;
    className?: string;
}

export const SelectSortControl: React.FC<SelectSortControlProps> = ({
    sortBy,
    onSortByChange,
    className = '',
}) => {
    const { t } = useTranslation();

    return (
        <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as ProjectSortField)}
            className={`text-xs text-foreground bg-transparent border-none outline-none cursor-pointer text-q-text-muted hover:text-foreground focus:ring-0 py-0.5 w-auto max-w-[7.5rem] sm:max-w-[8rem] min-w-0 ${className}`}
            aria-label={t('common.sortBy', 'Ordenar por')}
        >
            <option value="recent">{t('common.mostRecent', 'Más recientes')}</option>
            <option value="name">{t('common.alphabetical', 'Alfabético')}</option>
        </select>
    );
};

interface SortViewControlsProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    showViewToggle?: boolean;
    sortVariant?: 'cycle' | 'select' | 'none';
    sortBy?: DashboardSortField | ProjectSortField;
    sortOrder?: SortDirection;
    onSortByChange?: (field: DashboardSortField | ProjectSortField) => void;
    onSortOrderChange?: (order: SortDirection) => void;
    className?: string;
}

const SortViewControls: React.FC<SortViewControlsProps> = ({
    viewMode,
    onViewModeChange,
    showViewToggle = true,
    sortVariant = 'cycle',
    sortBy = 'lastUpdated',
    sortOrder = 'desc',
    onSortByChange,
    onSortOrderChange,
    className = '',
}) => {
    if (sortVariant === 'none' && !showViewToggle) {
        return null;
    }

    return (
        <div className={`flex items-center gap-2 shrink-0 ${className}`}>
            {sortVariant === 'cycle' && onSortByChange && onSortOrderChange && (
                <CycleSortButton
                    sortBy={sortBy as DashboardSortField}
                    sortOrder={sortOrder}
                    onSortByChange={onSortByChange as (field: DashboardSortField) => void}
                    onSortOrderChange={onSortOrderChange}
                />
            )}
            {sortVariant === 'select' && onSortByChange && (
                <SelectSortControl
                    sortBy={sortBy as ProjectSortField}
                    onSortByChange={onSortByChange as (field: ProjectSortField) => void}
                />
            )}
            {showViewToggle && (
                <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
            )}
        </div>
    );
};

export default SortViewControls;
