import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../contexts/project';
import { useUI } from '../../contexts/core/UIContext';
import { useRouter } from '../../hooks/useRouter';
import { useProjectTokenUsage } from '../../hooks/useProjectTokenUsage';
import { ROUTES } from '../../routes/config';
import ProjectCard from './ProjectCard';
import ProjectCardSkeleton from './ProjectCardSkeleton';
import EmptyState from './EmptyState';
import { Plus, Search, Globe } from 'lucide-react';

interface DashboardProjectsSectionProps {
    userProjects: any[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}

/**
 * DashboardProjectsSection
 *
 * Content for the "Recent Projects" draggable section.
 * Shows up to 4 project cards or empty/loading state.
 * Extracted from Dashboard.tsx lines 654-728.
 */
const DashboardProjectsSection: React.FC<DashboardProjectsSectionProps> = ({
    userProjects,
    searchQuery,
    setSearchQuery,
}) => {
    const { t } = useTranslation();
    const { isLoadingProjects } = useProject();
    const { setIsOnboardingOpen } = useUI();
    const { projectUsage } = useProjectTokenUsage();

    // Compute max credits across all projects for relative bar scaling
    const maxTokens = React.useMemo(() => {
        const values = Object.values(projectUsage).map((u) => u.creditsUsed);
        return values.length > 0 ? Math.max(...values) : 1;
    }, [projectUsage]);

    if (isLoadingProjects) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <ProjectCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (userProjects.length > 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                {userProjects.slice(0, 4).map((project) => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        tokenUsage={projectUsage[project.id]}
                        maxTokens={maxTokens}
                    />
                ))}
            </div>
        );
    }

    return (
        <EmptyState
            icon={searchQuery ? Search : Globe}
            title={
                searchQuery
                    ? t('dashboard.emptyState.titleNoProjects')
                    : t('dashboard.emptyState.titleNoWebsites')
            }
            description={
                searchQuery
                    ? t('dashboard.emptyState.descNoProjects', { query: searchQuery })
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
    );
};

/**
 * Helper component: "View All" link used as `rightAction` in the draggable section.
 */
export const ProjectsViewAllAction: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useRouter();
    const { projects } = useProject();
    const allUserProjects = projects.filter((p) => p.status !== 'Template');

    if (allUserProjects.length === 0) return null;

    return (
        <button
            onClick={() => navigate(ROUTES.WEBSITES)}
            className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors flex items-center"
        >
            {t('dashboard.viewAll')} <Globe size={14} className="ml-1" />
        </button>
    );
};

export default DashboardProjectsSection;
