import React from 'react';
import CatalogFilterBar from './CatalogFilterBar';
import CatalogToolbarFooter from './CatalogToolbarFooter';
import { ProjectStatusFilterChips, type ProjectFilterStatus } from './StatusFilterChips';
import SortViewControls, {
    type DashboardSortField,
    type SortDirection,
    type ViewMode,
} from './SortViewControls';

export interface WebsiteCatalogToolbarProps {
    filterStatus: ProjectFilterStatus;
    onFilterStatusChange: (status: ProjectFilterStatus) => void;
    totalCount: number;
    publishedCount: number;
    draftCount: number;
    filteredCount: number;
    sortBy: DashboardSortField;
    sortOrder: SortDirection;
    onSortByChange: (field: DashboardSortField) => void;
    onSortOrderChange: (order: SortDirection) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    leading?: React.ReactNode;
    className?: string;
    countLabelKey?: string;
    countLabelDefault?: string;
}

/**
 * Canonical catalog toolbar — identical to WebsitesView:
 * FilterChips | CycleSort | ViewModeToggle + footer row.
 */
const WebsiteCatalogToolbar: React.FC<WebsiteCatalogToolbarProps> = ({
    filterStatus,
    onFilterStatusChange,
    totalCount,
    publishedCount,
    draftCount,
    filteredCount,
    sortBy,
    sortOrder,
    onSortByChange,
    onSortOrderChange,
    viewMode,
    onViewModeChange,
    leading,
    className,
    countLabelKey,
    countLabelDefault,
}) => (
    <CatalogFilterBar
        className={className}
        leading={leading}
        filters={
            <ProjectStatusFilterChips
                value={filterStatus}
                onChange={onFilterStatusChange}
                totalCount={totalCount}
                publishedCount={publishedCount}
                draftCount={draftCount}
            />
        }
        trailing={
            <SortViewControls
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                sortVariant="cycle"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={onSortByChange}
                onSortOrderChange={onSortOrderChange}
            />
        }
        footer={
            <CatalogToolbarFooter
                count={filteredCount}
                total={totalCount}
                countLabelKey={countLabelKey}
                countLabelDefault={countLabelDefault}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
            />
        }
    />
);

export default WebsiteCatalogToolbar;
