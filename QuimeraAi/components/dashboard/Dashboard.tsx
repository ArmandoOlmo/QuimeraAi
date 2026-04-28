
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/core/UIContext';
import { useDomains } from '../../contexts/domains/DomainsContext';
import { useCMS } from '../../contexts/cms';
import { useRouter } from '../../hooks/useRouter';
import { ROUTES } from '../../routes/config';
import { usePersistedBoolean } from '../../hooks/usePersistedState';
import { useDashboardSections } from '../../hooks/useDashboardSections';
import { useDashboardFilters } from '../../hooks/useDashboardFilters';
import { trackDashboardView } from '../../utils/analytics';

// Layout Components
import DashboardSidebar from './DashboardSidebar';
import DashboardWaveRibbons from './DashboardWaveRibbons';
import DashboardHeader from './DashboardHeader';
import DashboardWelcome from './DashboardWelcome';
import DashboardHelpGuide from './DashboardHelpGuide';
import DashboardDraggableSection from './DashboardDraggableSection';
import FileHistory from './FileHistory';
import WebsitesView from './WebsitesView';
import FirstVisitWelcomeBanner from './FirstVisitWelcomeBanner';

// Section Content Components
import DashboardProjectsSection, { ProjectsViewAllAction } from './DashboardProjectsSection';
import DashboardTemplatesSection, { TemplatesSizeToggle } from './DashboardTemplatesSection';
import DashboardLeadsSection, { LeadsViewAllAction } from './DashboardLeadsSection';
import DashboardNewsSection from './DashboardNewsSection';

// Icons
import { LayoutGrid, LayoutTemplate, Users, Newspaper } from 'lucide-react';

const Dashboard: React.FC = () => {
    const { t } = useTranslation();
    const { view, setIsOnboardingOpen } = useUI();
    const { domains } = useDomains();
    const { cmsPosts } = useCMS();
    const { navigate, goBack } = useRouter();

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
            rightAction: <TemplatesSizeToggle />,
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
        <div className="flex h-screen bg-q-bg text-foreground">
            {/* Skip to content link for accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-bold"
            >
                {t('common.skipToContent')}
            </a>

            <DashboardSidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <DashboardWaveRibbons />

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

                <main id="main-content" className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth" role="main">
                    <div className="max-w-7xl mx-auto space-y-10">

                        {/* ─── Dashboard Home View ─────────────────────────────────── */}
                        {isDashboard && (
                            <>
                                {/* Welcome / Hero Section */}
                                <DashboardWelcome allUserProjectsCount={filters.allUserProjects.length} />

                                {/* First Visit Welcome Banner */}
                                <FirstVisitWelcomeBanner hasProjects={filters.allUserProjects.length > 0} />

                                {/* Help Guide / Instructions */}
                                {showInstructions && (
                                    <div className="w-full animate-fade-in-up">
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
                                    </div>
                                )}

                                {/* Draggable Dashboard Sections */}
                                {sectionOrder.map((sectionId) => {
                                    const config = sectionConfig[sectionId];
                                    return (
                                        <DashboardDraggableSection
                                            key={sectionId}
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
                                    );
                                })}
                            </>
                        )}

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
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
