
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { useUI } from '../../contexts/core/UIContext';
import { useDomains } from '../../contexts/domains/DomainsContext';
import { useCMS } from '../../contexts/cms';
import { useRouter } from '../../hooks/useRouter';
import { usePersistedBoolean } from '../../hooks/usePersistedState';
import { useDashboardSections } from '../../hooks/useDashboardSections';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { trackDashboardView } from '../../utils/analytics';

// Layout Components
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import DashboardWelcome from './DashboardWelcome';
import DashboardHelpGuide from './DashboardHelpGuide';
import DashboardDraggableSection from './DashboardDraggableSection';
import FileHistory from './FileHistory';
import WebsitesView from './WebsitesView';
import FirstVisitWelcomeBanner from './FirstVisitWelcomeBanner';
import { PageContainer } from '../ui/system';

// Section Content Components
import DashboardProjectsSection, { ProjectsViewAllAction } from './DashboardProjectsSection';
import DashboardTemplatesSection from './DashboardTemplatesSection';
import DashboardLeadsSection, { LeadsViewAllAction } from './DashboardLeadsSection';
import DashboardNewsSection from './DashboardNewsSection';
import {
    dashboardContainerVariants,
    dashboardItemVariants,
    getDashboardSectionTransition,
} from './dashboardMotion';
import { AppShell, AppShellContent, AppShellMain } from '@/src/design-system/components/AppShell';

// Icons
import { LayoutGrid, LayoutTemplate, Users, Newspaper } from 'lucide-react';

const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const { view, setIsOnboardingOpen } = useUI();
    const { domains } = useDomains();
    const { cmsPosts } = useCMS();
    const { goBack } = useRouter();
    const shouldReduceMotion = useReducedMotion();

    // ─── Custom Hooks ────────────────────────────────────────────────────────
    const filters = useDashboardFilters();
    const { sectionOrder, dragHandlers, getWrapperClasses } = useDashboardSections();

    // ─── Local UI State ──────────────────────────────────────────────────────
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    // Collapsible section states (persisted)
    const [projectsCollapsed, setProjectsCollapsed] = usePersistedBoolean('quimera_projects_collapsed', false);
    const [templatesCollapsed, setTemplatesCollapsed] = usePersistedBoolean('quimera_templates_collapsed', false);
    const [leadsCollapsed, setLeadsCollapsed] = usePersistedBoolean('quimera_leads_collapsed', false);
    const [newsCollapsed, setNewsCollapsed] = usePersistedBoolean('quimera_news_collapsed', false);

    // Instructions banner visibility (persisted)
    const [showInstructions, setShowInstructions] = usePersistedBoolean('quimera_show_instructions', true);

    const dismissInstructions = () => setShowInstructions(false);

    // ─── View States ─────────────────────────────────────────────────────────
    const isDashboard = view === 'dashboard';
    const isWebsites = view === 'websites';
    const isAssets = view === 'assets';

    // Track dashboard view changes
    useEffect(() => {
        if (isDashboard || isWebsites || isAssets) {
            trackDashboardView(view);
        }
    }, [view]);

    // ─── Section Configuration Map ──────────────────────────────────────────
    const sectionConfig = {
        projects: {
            title: t('dashboard.recentProjects'),
            icon: LayoutGrid,
            isCollapsed: projectsCollapsed,
            onToggle: () => setProjectsCollapsed((p) => !p),
            rightAction: <ProjectsViewAllAction />,
            content: (
                <DashboardProjectsSection
                    userProjects={filters.userProjects}
                    searchQuery={filters.searchQuery}
                    setSearchQuery={filters.setSearchQuery}
                />
            ),
        },
        templates: {
            title: t('dashboard.startFromTemplate'),
            icon: LayoutTemplate,
            isCollapsed: templatesCollapsed,
            onToggle: () => setTemplatesCollapsed((p) => !p),
            rightAction: undefined,
            content: <DashboardTemplatesSection templates={filters.templates} />,
        },
        leads: {
            title: t('dashboard.leads.title', 'Últimos Leads'),
            icon: Users,
            isCollapsed: leadsCollapsed,
            onToggle: () => setLeadsCollapsed((p) => !p),
            rightAction: <LeadsViewAllAction />,
            content: <DashboardLeadsSection />,
        },
        news: {
            title: t('dashboard.news.title', 'Noticias y Novedades'),
            icon: Newspaper,
            isCollapsed: newsCollapsed,
            onToggle: () => setNewsCollapsed((p) => !p),
            rightAction: undefined,
            content: <DashboardNewsSection />,
        },
    } as const;

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <AppShell>
            {/* Skip to content link for accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-bold"
            >
                {t('common.skipToContent')}
            </a>

            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <AppShellMain>
                <DashboardHeader
                    isDashboard={isDashboard}
                    isWebsites={isWebsites}
                    isAssets={isAssets}
                    isMobileMenuOpen={isMobileMenuOpen}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                    searchQuery={filters.searchQuery}
                    setSearchQuery={filters.setSearchQuery}
                    showMobileSearch={showMobileSearch}
                    setShowMobileSearch={setShowMobileSearch}
                    onNavigateBack={() => goBack()}
                />

                <AppShellContent
                    id="main-content"
                    className={
                        isDashboard
                            ? 'quimera-dashboard-home-bg'
                            : 'p-3 sm:p-6 lg:p-8'
                    }
                    role="main"
                >
                    {/* ─── Dashboard Home View ─────────────────────────────────── */}
                    {isDashboard ? (
                        <PageContainer className="relative z-[1] space-y-6 !px-3 !py-3 sm:!px-6 sm:!py-6 lg:!px-8 lg:!py-8 lg:space-y-10">
                            <motion.div
                                className="relative space-y-6 lg:space-y-10"
                                initial={shouldReduceMotion ? false : 'hidden'}
                                animate="show"
                                variants={dashboardContainerVariants}
                            >
                                {!shouldReduceMotion && (
                                    <motion.div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-x-0 -top-6 z-0 h-40 rounded-[var(--q-radius-2xl)] bg-gradient-to-r from-transparent via-white/18 to-transparent blur-2xl dark:via-white/10"
                                        initial={{ opacity: 0.55, x: '-18%', y: -20 }}
                                        animate={{ opacity: 0, x: '18%', y: 10 }}
                                        transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                )}

                                {/* Welcome / Hero Section */}
                                <motion.div className="relative z-[30]" variants={dashboardItemVariants}>
                                    <DashboardWelcome allUserProjectsCount={filters.allUserProjects.length} />
                                </motion.div>

                                {/* First Visit Welcome Banner */}
                                <motion.div className="relative z-[1]" variants={dashboardItemVariants}>
                                    <FirstVisitWelcomeBanner hasProjects={filters.allUserProjects.length > 0} />
                                </motion.div>

                                {/* Help Guide / Instructions */}
                                {showInstructions && (
                                    <motion.div className="relative z-[1] w-full" variants={dashboardItemVariants}>
                                        <DashboardHelpGuide
                                            onClose={dismissInstructions}
                                            hasProjects={filters.allUserProjects.length > 0}
                                            hasPublished={domains.some(
                                                (d) => d.status === 'active' || d.status === 'deployed',
                                            )}
                                            hasDomain={domains.length > 0}
                                            hasCMSContent={cmsPosts.length > 0}
                                            onCreateProject={() => setIsOnboardingOpen(true)}
                                        />
                                    </motion.div>
                                )}

                                {/* Draggable Dashboard Sections */}
                                <motion.div className="quimera-dashboard-section-deck relative z-[1] space-y-6 lg:space-y-8" variants={dashboardItemVariants}>
                                    {sectionOrder.map((sectionId, index) => {
                                        const config = sectionConfig[sectionId];
                                        return (
                                            <motion.div
                                                key={sectionId}
                                                initial={shouldReduceMotion ? false : { opacity: 0, y: 28, scale: 0.97, filter: 'blur(8px)' }}
                                                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                                transition={getDashboardSectionTransition(index)}
                                            >
                                                <DashboardDraggableSection
                                                    sectionId={sectionId}
                                                    title={config.title}
                                                    icon={config.icon}
                                                    isCollapsed={config.isCollapsed}
                                                    onToggleCollapse={config.onToggle}
                                                    wrapperClasses={getWrapperClasses(sectionId)}
                                                    dragHandlers={dragHandlers}
                                                    rightAction={config.rightAction}
                                                >
                                                    {config.content}
                                                </DashboardDraggableSection>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            </motion.div>
                        </PageContainer>
                    ) : (
                        <div className="relative z-[1] max-w-7xl mx-auto space-y-6 lg:space-y-10">
                            {/* ─── Websites View ───────────────────────────────────────── */}
                            {isWebsites && <WebsitesView filters={filters} />}

                            {/* ─── Assets View ─────────────────────────────────────────── */}
                            {isAssets && (
                                <section className="h-full flex flex-col">
                                    <div className="flex-1">
                                        <FileHistory variant="full" />
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </AppShellContent>
            </AppShellMain>
        </AppShell>
    );
};

export default Dashboard;
