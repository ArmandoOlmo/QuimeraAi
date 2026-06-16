import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/core/UIContext';
import { useProject } from '../../contexts/project';
import { useProjectTokenUsage } from '../../hooks/useProjectTokenUsage';
import type { DashboardFiltersHook } from '../../hooks/useDashboardFilters';
import ProjectCard from './ProjectCard';
import ProjectCardSkeleton from './ProjectCardSkeleton';
import ProjectListItem from './ProjectListItem';
import EmptyState from './EmptyState';
import {
    WebsiteCatalogToolbar,
} from './filters';
import {
    Plus,
    Search,
    Globe,
    LayoutGrid,
    List,
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
                <WebsiteCatalogToolbar
                    filterStatus={filterStatus}
                    onFilterStatusChange={setFilterStatus}
                    totalCount={allUserProjects.length}
                    publishedCount={publishedCount}
                    draftCount={draftCount}
                    filteredCount={userProjects.length}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortByChange={setSortBy}
                    onSortOrderChange={setSortOrder}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />

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
