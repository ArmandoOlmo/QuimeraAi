import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/core/UIContext';
import { useProject } from '../../contexts/project';
import { useProjectTokenUsage } from '../../hooks/useProjectTokenUsage';
import type { DashboardFiltersHook } from '../../hooks/useDashboardFilters';
import ProjectCard from './ProjectCard';
import ProjectCardSkeleton from './ProjectCardSkeleton';
import ProjectListItem from './ProjectListItem';
import FilterChip from './FilterChip';
import EmptyState from './EmptyState';
import {
    Plus,
    Search,
    Globe,
    LayoutGrid,
    List,
    ArrowUpDown,
    CheckCircle,
    FileEdit,
} from 'lucide-react';

interface WebsitesViewProps {
    filters: DashboardFiltersHook;
}

interface WebsiteStatCard {
    id: string;
    icon: React.ElementType;
    value: number;
    labelKey: string;
}

/**
 * WebsitesView
 *
 * Full "My Websites" view with statistics, filter chips, grid/list toggle,
 * sorting, and paginated project display.
 * Extracted from Dashboard.tsx lines 578-1023.
 */
const WebsitesView: React.FC<WebsitesViewProps> = ({ filters }) => {
    const { t } = useTranslation();
    const { setIsOnboardingOpen } = useUI();
    const { isLoadingProjects } = useProject();
    const { projectUsage } = useProjectTokenUsage();

    const {
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
        allUserProjects,
        publishedCount,
        draftCount,
    } = filters;

    // Compute max credits across all projects for relative bar scaling
    const maxTokens = React.useMemo(() => {
        const values = Object.values(projectUsage).map((u) => u.creditsUsed);
        return values.length > 0 ? Math.max(...values) : 1;
    }, [projectUsage]);

    const statCards: WebsiteStatCard[] = [
        {
            id: 'total',
            icon: Globe,
            value: allUserProjects.length,
            labelKey: 'dashboard.totalWebsites',
        },
        {
            id: 'published',
            icon: CheckCircle,
            value: publishedCount,
            labelKey: 'dashboard.published',
        },
        {
            id: 'draft',
            icon: FileEdit,
            value: draftCount,
            labelKey: 'dashboard.draft',
        },
        {
            id: 'filtered',
            icon: LayoutGrid,
            value: userProjects.length,
            labelKey: 'dashboard.filtered',
        },
    ];

    return (
        <>
            {/* Statistics Section */}
            <section className="relative z-[1] grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div
                            key={card.id}
                            className="group relative overflow-hidden rounded-xl md:rounded-2xl border border-q-border/60
                                bg-q-surface/80 backdrop-blur-xl p-2.5 md:p-4
                                hover:border-q-border
                                transition-all duration-300 ease-out"
                        >
                            <div
                                className="quimera-status-card-accent-bg quimera-status-card-blob absolute -top-8 -right-8 w-24 h-24 md:w-32 md:h-32 rounded-full blur-2xl
                                    group-hover:scale-110 transition-all duration-500"
                                aria-hidden="true"
                            />

                            <div className="relative z-10">
                                <div className="mb-1 md:mb-2">
                                    <Icon className="w-5 h-5 quimera-dashboard-header-icon flex-shrink-0" strokeWidth={2} />
                                </div>
                                <div className="text-xl md:text-3xl font-extrabold text-foreground">
                                    {card.value}
                                </div>
                                <div className="text-[10px] md:text-xs font-semibold text-q-text-muted uppercase tracking-wider mt-0.5 md:mt-1 leading-tight">
                                    {t(card.labelKey)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* Projects Section with Filters */}
            <section className="relative z-[1]">
                {/* Filter Chips */}
                <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <FilterChip
                            label={t('dashboard.allStatus')}
                            active={filterStatus === 'all'}
                            count={allUserProjects.length}
                            onClick={() => setFilterStatus('all')}
                        />
                        <FilterChip
                            label={t('dashboard.published')}
                            active={filterStatus === 'Published'}
                            count={publishedCount}
                            onClick={() => setFilterStatus('Published')}
                            color="green"
                        />
                        <FilterChip
                            label={t('dashboard.draft')}
                            active={filterStatus === 'Draft'}
                            count={draftCount}
                            onClick={() => setFilterStatus('Draft')}
                            color="gray"
                        />

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Sort Button */}
                        <button
                            onClick={() => {
                                if (sortBy === 'lastUpdated') {
                                    setSortBy('name');
                                    setSortOrder('asc');
                                } else if (sortBy === 'name' && sortOrder === 'asc') {
                                    setSortOrder('desc');
                                } else {
                                    setSortBy('lastUpdated');
                                    setSortOrder('desc');
                                }
                            }}
                            className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all bg-secondary/50 text-q-text-muted hover:text-foreground hover:bg-secondary"
                            aria-label={`Sort by ${sortBy} (${sortOrder}ending)`}
                        >
                            <ArrowUpDown size={14} aria-hidden="true" />
                            <span className="hidden md:inline">
                                {sortBy === 'name' ? t('common.name') : t('common.updated')}
                            </span>
                        </button>

                        {/* View Mode Toggle */}
                        <div
                            className="hidden sm:flex items-center gap-1 bg-secondary/40 rounded-lg p-1"
                            role="group"
                            aria-label="View mode"
                        >
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${
                                    viewMode === 'grid'
                                        ? 'text-primary bg-q-bg'
                                        : 'text-q-text-muted hover:text-foreground'
                                }`}
                                aria-label={t('dashboard.gridView')}
                                aria-pressed={viewMode === 'grid'}
                            >
                                <LayoutGrid size={15} aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`h-8 w-8 flex items-center justify-center rounded-md transition-all ${
                                    viewMode === 'list'
                                        ? 'text-primary bg-q-bg'
                                        : 'text-q-text-muted hover:text-foreground'
                                }`}
                                aria-label={t('dashboard.listView')}
                                aria-pressed={viewMode === 'list'}
                            >
                                <List size={15} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs md:text-sm text-q-text-muted">
                            {t('dashboard.showingProjects', {
                                count: userProjects.length,
                                total: allUserProjects.length,
                            })}
                        </span>
                        {/* Mobile controls */}
                        <div className="flex items-center gap-2 sm:hidden">
                            <button
                                onClick={() =>
                                    setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                                }
                                className="p-2 bg-secondary/50 rounded-lg text-q-text-muted hover:text-foreground transition-colors"
                            >
                                {viewMode === 'grid' ? (
                                    <List size={16} />
                                ) : (
                                    <LayoutGrid size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Project Cards */}
                {isLoadingProjects ? (
                    <>
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <ProjectCardSkeleton key={i} />
                                ))}
                            </div>
                        )}
                        {viewMode === 'list' && (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <ProjectCardSkeleton key={i} />
                                ))}
                            </div>
                        )}
                    </>
                ) : userProjects.length > 0 ? (
                    <>
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                                {userProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        tokenUsage={projectUsage[project.id]}
                                        maxTokens={maxTokens}
                                    />
                                ))}
                            </div>
                        )}
                        {viewMode === 'list' && (
                            <div className="space-y-4">
                                {userProjects.map((project) => (
                                    <ProjectListItem
                                        key={project.id}
                                        project={project}
                                        tokenUsage={projectUsage[project.id]}
                                        maxTokens={maxTokens}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <EmptyState
                        icon={searchQuery ? Search : Globe}
                        title={
                            searchQuery
                                ? t('dashboard.emptyState.titleNoProjects')
                                : t('dashboard.emptyState.titleNoWebsites')
                        }
                        description={
                            searchQuery
                                ? t('dashboard.emptyState.descNoProjects', {
                                      query: searchQuery,
                                  })
                                : t('dashboard.emptyState.descNoWebsites')
                        }
                        illustration={searchQuery ? 'search' : 'website'}
                        action={
                            searchQuery
                                ? undefined
                                : {
                                      label: t('dashboard.emptyState.createFirst'),
                                      onClick: () => setIsOnboardingOpen(true),
                                      icon: Plus,
                                  }
                        }
                        secondaryAction={
                            searchQuery
                                ? {
                                      label: 'Clear Search',
                                      onClick: () => setSearchQuery(''),
                                  }
                                : undefined
                        }
                    />
                )}
            </section>
        </>
    );
};

export default WebsitesView;
