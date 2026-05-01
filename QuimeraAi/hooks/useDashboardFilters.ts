import { useState, useMemo, useEffect } from 'react';
import { useProject } from '../contexts/project';
import { useInfiniteScroll, paginateArray, hasMoreItems } from './useInfiniteScroll';
import {
    trackSearchPerformed,
    trackFilterApplied,
    trackSortChanged,
    trackViewModeChanged,
} from '../utils/analytics';
import { resolveProjectName } from '../utils/resolveProjectName';

// ─── Types ───────────────────────────────────────────────────────────────────
export type FilterStatus = 'all' | 'Published' | 'Draft';
export type SortField = 'lastUpdated' | 'name';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

export interface DashboardFiltersHook {
    // Search
    searchQuery: string;
    setSearchQuery: (q: string) => void;

    // Filters
    filterStatus: FilterStatus;
    setFilterStatus: (s: FilterStatus) => void;

    // Sort
    sortBy: SortField;
    setSortBy: (s: SortField) => void;
    sortOrder: SortDirection;
    setSortOrder: (o: SortDirection) => void;

    // View
    viewMode: ViewMode;
    setViewMode: (m: ViewMode) => void;

    // Derived data
    userProjects: any[];
    templates: any[];
    allUserProjects: any[];
    publishedCount: number;
    draftCount: number;

    // Pagination (for Websites full view)
    paginatedProjects: any[];
    hasMore: boolean;
    loadMore: () => void;
    observerTarget: React.RefObject<HTMLDivElement>;
}

const ITEMS_PER_PAGE = 20;

/**
 * useDashboardFilters
 *
 * Encapsulates all filtering, sorting, pagination, and analytics tracking
 * logic that was previously inline in Dashboard.tsx (lines 238-345).
 */
export function useDashboardFilters(): DashboardFiltersHook {
    const { projects, isLoadingProjects } = useProject();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [sortBy, setSortBy] = useState<SortField>('lastUpdated');
    const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [currentPage, setCurrentPage] = useState(1);

    // Derived: filtered & sorted user projects
    const userProjects = useMemo(() => {
        let filtered = projects.filter(
            (p) =>
                p.status !== 'Template' &&
                resolveProjectName(p.name).toLowerCase().includes(searchQuery.toLowerCase()),
        );

        if (filterStatus !== 'all') {
            filtered = filtered.filter((p) => p.status === filterStatus);
        }

        filtered.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'name') {
                comparison = resolveProjectName(a.name).localeCompare(resolveProjectName(b.name));
            } else {
                comparison =
                    new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [projects, searchQuery, filterStatus, sortBy, sortOrder]);

    const templates = useMemo(
        () => projects.filter((p) => p.status === 'Template'),
        [projects],
    );

    const allUserProjects = useMemo(
        () => projects.filter((p) => p.status !== 'Template'),
        [projects],
    );

    const publishedCount = useMemo(
        () => allUserProjects.filter((p) => p.status === 'Published').length,
        [allUserProjects],
    );

    const draftCount = useMemo(
        () => allUserProjects.filter((p) => p.status === 'Draft').length,
        [allUserProjects],
    );

    // ─── Analytics Tracking ──────────────────────────────────────────────────
    useEffect(() => {
        if (searchQuery.length > 2) {
            const timeoutId = setTimeout(() => {
                trackSearchPerformed(searchQuery, userProjects.length);
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [searchQuery, userProjects.length]);

    useEffect(() => {
        if (filterStatus !== 'all') {
            trackFilterApplied('status', filterStatus, userProjects.length);
        }
    }, [filterStatus]);

    useEffect(() => {
        trackSortChanged(sortBy, sortOrder);
    }, [sortBy, sortOrder]);

    useEffect(() => {
        trackViewModeChanged(viewMode);
    }, [viewMode]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterStatus, sortBy, sortOrder]);

    // ─── Pagination ──────────────────────────────────────────────────────────
    const paginatedProjects = useMemo(
        () => paginateArray(userProjects, currentPage, ITEMS_PER_PAGE),
        [userProjects, currentPage],
    );

    const hasMore = hasMoreItems(userProjects.length, currentPage, ITEMS_PER_PAGE);

    const loadMore = () => {
        if (hasMore && !isLoadingProjects) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const observerTarget = useInfiniteScroll({
        onLoadMore: loadMore,
        hasMore,
        isLoading: isLoadingProjects,
        threshold: 200,
    });

    return {
        searchQuery,
        setSearchQuery,
        filterStatus,
        setFilterStatus,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        viewMode,
        setViewMode,
        userProjects,
        templates,
        allUserProjects,
        publishedCount,
        draftCount,
        paginatedProjects,
        hasMore,
        loadMore,
        observerTarget,
    };
}
