import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from './SortViewControls';

interface CatalogToolbarFooterProps {
    count: number;
    total: number;
    countLabelKey?: string;
    countLabelDefault?: string;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
}

/**
 * Second row below filter chips — matches WebsitesView footer.
 */
const CatalogToolbarFooter: React.FC<CatalogToolbarFooterProps> = ({
    count,
    total,
    countLabelKey = 'dashboard.showingProjects',
    countLabelDefault,
    viewMode,
    onViewModeChange,
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm text-q-text-muted">
                {countLabelDefault
                    ? countLabelDefault
                    : t(countLabelKey, { count, total, defaultValue: `Showing ${count} of ${total}` })}
            </span>
            {viewMode && onViewModeChange && (
                <div className="flex items-center gap-2 sm:hidden">
                    <button
                        type="button"
                        onClick={() => onViewModeChange(viewMode === 'grid' ? 'list' : 'grid')}
                        className="p-2 bg-secondary/50 rounded-lg text-q-text-muted hover:text-foreground transition-colors"
                        aria-label={t('dashboard.gridView', 'Toggle view mode')}
                    >
                        {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CatalogToolbarFooter;
