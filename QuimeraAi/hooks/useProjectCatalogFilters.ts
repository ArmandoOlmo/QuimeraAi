import { useMemo, useState } from 'react';
import type { Project } from '../types';
import type { ProjectFilterStatus } from '../components/dashboard/filters/StatusFilterChips';
import type {
    DashboardSortField,
    SortDirection,
    ViewMode,
} from '../components/dashboard/filters/SortViewControls';
import { resolveProjectName } from '../utils/resolveProjectName';

export interface ProjectCatalogFiltersState {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filterStatus: ProjectFilterStatus;
    setFilterStatus: (s: ProjectFilterStatus) => void;
    sortBy: DashboardSortField;
    setSortBy: (s: DashboardSortField) => void;
    sortOrder: SortDirection;
    setSortOrder: (o: SortDirection) => void;
    viewMode: ViewMode;
    setViewMode: (m: ViewMode) => void;
    userProjects: Project[];
    filteredProjects: Project[];
    publishedCount: number;
    draftCount: number;
}

/**
 * Shared filter/sort/view state for project catalog screens (WebsitesView pattern).
 */
export function useProjectCatalogFilters(projects: Project[]): ProjectCatalogFiltersState {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<ProjectFilterStatus>('all');
    const [sortBy, setSortBy] = useState<DashboardSortField>('lastUpdated');
    const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    const userProjects = useMemo(
        () => projects.filter((p) => p.status !== 'Template'),
        [projects],
    );

    const publishedCount = useMemo(
        () => userProjects.filter((p) => p.status === 'Published').length,
        [userProjects],
    );

    const draftCount = useMemo(
        () => userProjects.filter((p) => p.status === 'Draft').length,
        [userProjects],
    );

    const filteredProjects = useMemo(() => {
        let filtered = userProjects.filter((p) =>
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
    }, [userProjects, searchQuery, filterStatus, sortBy, sortOrder]);

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
        filteredProjects,
        publishedCount,
        draftCount,
    };
}
